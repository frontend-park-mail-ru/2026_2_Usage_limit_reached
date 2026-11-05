import profileTemplate from './profile.hbs';
import { checkSession, getSessionContext, getSessionVersion, isSessionCurrent, loadProfilePosts } from '../../modules/auth/auth.actions.ts';
import type { SavedProfile, SavedPosts } from '../../modules/offline/offline.types.ts';
import type { Profile } from '../../modules/api/profile.types.ts';
import { captureOfflineToken, readOfflineCopy } from '../../modules/offline/offline.storage.ts';
import { bindOfflineRecovery, isBackendUnavailable } from '../../modules/offline/offline.recovery.ts';
import { ApiError } from '../../modules/api/request.ts';
import { formatPostCount, formatPublishedAt } from '../../utils/helpers/posts.ts';
import type { Navigate } from '../../app/paths.ts';
import type { SetRefreshNotice } from '../../components/refreshNotice/refreshNotice.types.ts';

/**
 * Готовит профиль и опубликованные посты для шаблона.
 * @param profileResponse
 * @param postsResponse
 */
export function buildProfileViewModel(profileResponse: Pick<SavedProfile, 'user' | 'author'> | undefined, postsResponse: Pick<SavedPosts, 'items' | 'next_cursor'> | undefined, offline = false) {
  const referenceTime = new Date();
  const posts = (postsResponse?.items ?? []).map((post) => {
    const publishedAt = post.published_or_updated_at ?? '';
    return {
      id: post.id,
      title: post.title,
      bodyPreview: post.locked ? '' : post.body_preview,
      publishedAt,
      publishedAtLabel: formatPublishedAt(publishedAt, referenceTime),
    };
  });
  return {
    name: profileResponse?.user.nickname ?? '',
    username: profileResponse ? `@${profileResponse.user.username}` : '',
    hasAuthor: !!profileResponse?.author,
    bio: profileResponse?.author?.bio ?? '',
    avatarUrl: '/assets/profile/avatar-placeholder.svg',
    postCountLabel: `Загружено: ${formatPostCount(posts.length)}`,
    hasMorePosts: !!postsResponse?.next_cursor,
    hasPosts: posts.length > 0,
    posts,
    profileMissing: !profileResponse,
    postsMissing: !postsResponse,
    showPosts: offline || !!profileResponse?.author,
    offline,
  };
}

/** Возвращает каркас профиля с текстом загрузки. */
export function renderProfile(): string {
  return profileTemplate({ message: 'Загрузка профиля...', loading: true });
}

/** Загружает данные и подключает повторные попытки на время жизни страницы. */
export function initProfile(root: HTMLElement, _navigate: Navigate, setRefreshNotice: SetRefreshNotice): () => void {
  let active = true;
  let busy = false;
  let needsRetry = false;
  let displayedOwnerId: string | undefined;
  const retry = () => { void load(); };
  const showRetry = () => {
    needsRetry = true;
    setRefreshNotice({ pending: busy }, retry);
  };
  const showError = (message: string) => {
    root.innerHTML = profileTemplate({ message, isError: true });
    displayedOwnerId = undefined;
    showRetry();
  };
  const load = async () => {
    if (!active || busy) {
      return;
    }
    busy = true;
    if (needsRetry) {
      setRefreshNotice({ pending: true }, retry);
    }
    let version = getSessionVersion();
    let profile: Profile | undefined;
    try {
      profile = await checkSession();
      if (!active) {
        return;
      }
      const context = getSessionContext();
      if (!profile || !context || context.userId !== profile.user.id) {
        return;
      }
      version = getSessionVersion();
      if (displayedOwnerId && displayedOwnerId !== context.userId) {
        root.innerHTML = renderProfile();
        displayedOwnerId = undefined;
      }
      const posts = await loadProfilePosts();
      if (!active || !isSessionCurrent(context)) {
        return;
      }
      if (!posts) {
        showError('Данные аккаунта изменились. Попробуйте снова');
        return;
      }
      root.innerHTML = profileTemplate(buildProfileViewModel(profile, posts));
      displayedOwnerId = context.userId;
      needsRetry = false;
      setRefreshNotice(null);
    } catch (error) {
      if (!active || version !== getSessionVersion()) {
        return;
      }
      if (!isBackendUnavailable(error)) {
        const message = error instanceof ApiError && error.status === 403
          ? 'Доступ к этим данным запрещён'
          : error instanceof ApiError ? error.text : 'Не удалось загрузить данные';
        showError(message);
        return;
      }
      const ownerId = profile?.user.id ?? getSessionContext()?.userId;
      // Повторный сетевой сбой не требует заново читать уже показанную копию.
      if (displayedOwnerId && (!ownerId || displayedOwnerId === ownerId)) {
        showRetry();
        return;
      }
      const copy = await readOfflineCopy(ownerId);
      const token = await captureOfflineToken();
      if (!active || version !== getSessionVersion()) {
        return;
      }
      const saved = copy && token?.generation === copy.generation ? copy : undefined;
      root.innerHTML = profileTemplate(buildProfileViewModel(profile ?? saved?.profile, saved?.posts, true));
      displayedOwnerId = profile?.user.id ?? saved?.ownerId;
      showRetry();
    } finally {
      busy = false;
      if (active && needsRetry) {
        setRefreshNotice({ pending: false }, retry);
      }
      if (active && root.querySelector('[data-profile-loading]')) {
        showError('Состояние аккаунта изменилось. Попробуйте снова');
      }
    }
  };
  const unbind = bindOfflineRecovery(retry, () => active && needsRetry);
  root.innerHTML = renderProfile();
  void load();
  return () => {
    active = false;
    unbind();
    setRefreshNotice(null);
  };
}
