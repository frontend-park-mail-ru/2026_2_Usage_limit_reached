import { startLoading, cancelLoading } from '@/utils/helpers/delayedLoading.ts';
import profileTemplate from './publicProfile.hbs';
import { bindProfileBio } from '@/components/profileBio/profileBio.ts';
import { DonateDialog } from '@/components/donateDialog/donateDialog.ts';
import { showToast } from '@/components/toast/toast.ts';
import { checkSession, getSessionContext, getSessionVersion } from '@/modules/auth/auth.actions.ts';
import { authStore } from '@/modules/auth/auth.store.ts';
import { loadOfflinePublicProfile } from '@/modules/offline/offline.pages.ts';
import { bindOfflineRecovery } from '@/modules/offline/offline.recovery.ts';
import { getPublicProfile } from '@/modules/api/profile.ts';
import { getPublicPosts } from '@/modules/api/posts.ts';
import { ApiError } from '@/modules/api/request.ts';
import { AVATAR_PLACEHOLDER } from '@/modules/profile/profile.constants.ts';
import { ROUTES } from '@/app/paths.ts';
import type { Navigate } from '@/app/paths.ts';
import type { RouteParams } from '@/app/router.types.ts';
import { requireElement } from '@/utils/helpers/dom.ts';
import { LOAD_ERROR, LOADING_MESSAGE } from './profile.constants.ts';
import { bindLikedPosts } from '@/components/postsList/bindLikedPosts.ts';
import type { SetRefreshNotice } from '@/components/refreshNotice/refreshNotice.types.ts';

/** Показывает состояние загрузки публичного профиля. */
export function renderPublicProfile(): string {
  return profileTemplate({ message: LOADING_MESSAGE, loading: true });
}

/**
 * Показывает профиль и подключает действия посетителя.
 * @param root
 * @param navigate
 * @param params
 */
export function initPublicProfile(root: HTMLElement, navigate: Navigate, params: RouteParams, setRefreshNotice: SetRefreshNotice): () => void {
  let active = true;
  let request = 0;
  let busy = false;
  let offline = false;
  let needsRetry = false;
  let disposePosts: (() => void) | undefined;
  let dialog: DonateDialog | undefined;
  let disposeBio: (() => void) | undefined;

  async function load(): Promise<void> {
    const id = ++request;
    let version = getSessionVersion();
    const isCurrent = () => active && id === request && version === getSessionVersion();
    busy = true;
    disposePosts?.();
    disposeBio?.();
    dialog?.destroy();
    disposePosts = undefined;
    setRefreshNotice(needsRetry ? { pending: true } : null, () => { void load(); });
    disposeBio = undefined;
    dialog = undefined;
    cancelLoading(root);
    root.innerHTML = renderPublicProfile();
    const stopLoading = startLoading(root);
    try {
      if (authStore.getState().status === 'unknown' || offline) {
        await checkSession().catch(() => {});
      }
      version = getSessionVersion();
      if (!isCurrent()) {
        return;
      }
      const { user, author, savedAt } = await loadOfflinePublicProfile(params.username,
        () => getPublicProfile(params.username), isCurrent);
      if (!isCurrent()) {
        return;
      }
      offline = savedAt !== undefined;
      needsRetry = offline;
      document.title = user.nickname;
      root.innerHTML = profileTemplate({
        name: user.nickname, username: `@${user.username}`, avatarUrl: user.avatar_url ?? AVATAR_PLACEHOLDER,
        bio: author?.bio, isAuthor: !!author,
        offline,
      });
      disposeBio = bindProfileBio(root);
      if (author) {
        disposePosts = bindLikedPosts(root, (query) => getPublicPosts(params.username, query), navigate, false, params.username, offline,
          (state, retry) => { if (!needsRetry) { setRefreshNotice(state, retry); } });
        const donate = requireElement<HTMLButtonElement>(root, '[data-donate]');
        donate.disabled = offline;
        const donateDialog = new DonateDialog(requireElement(root, '.donate-dialog'), isCurrent);
        donateDialog.setReadOnly(offline);
        dialog = donateDialog;
        const updateDonate = () => { donate.hidden = getSessionContext()?.userId === user.id; };
        updateDonate();
        donate.addEventListener('click', async () => {
          if (offline || !isCurrent()) {
            return;
          }
          donate.disabled = true;
          try {
            const viewer = await checkSession();
            if (!isCurrent()) {
              return;
            }
            if (!viewer) {
              navigate(ROUTES.login);
            } else if (viewer.user.id !== user.id) {
              donateDialog.open(user);
            }
            updateDonate();
          } catch (error) {
            if (isCurrent()) {
              if (error instanceof ApiError && error.isUnauthorized) {
                navigate(ROUTES.login);
              } else {
                showToast(error instanceof ApiError ? error.text : LOAD_ERROR, 'error');
              }
            }
          } finally {
            donate.disabled = offline;
          }
        });
      }
    } catch (error) {
      if (isCurrent()) {
        needsRetry = !(error instanceof ApiError && [401, 403, 404].includes(error.status));
        disposeBio?.();
        const missing = error instanceof ApiError && error.status === 404;
        root.innerHTML = profileTemplate({
          message: missing ? 'Профиль не найден' : 'Не удалось загрузить профиль', isError: true,
        });
      }
    } finally {
      stopLoading();
      if (id === request) {
        busy = false;
        if (needsRetry) {
          setRefreshNotice({ pending: false }, () => { void load(); });
        } else if (!disposePosts) {
          setRefreshNotice(null);
        }
      }
    }
  }
  const unbindRecovery = bindOfflineRecovery(() => { void load(); },
    () => active && needsRetry && !busy && !root.querySelector('dialog[open]'));
  const handleOffline = () => {
    offline = true;
    needsRetry = true;
    dialog?.setReadOnly(true);
    const donate = root.querySelector<HTMLButtonElement>('[data-donate]');
    if (donate) {
      donate.disabled = true;
    }
    setRefreshNotice({ pending: busy }, () => { void load(); });
  };
  window.addEventListener('offline', handleOffline);
  let previous = authStore.getState();
  const unsubscribe = authStore.subscribe(() => {
    const current = authStore.getState();
    const changed = current.status === 'unknown' || (previous.status !== 'unknown'
      && (current.status !== previous.status || current.user?.id !== previous.user?.id));
    previous = current;
    if (changed) {
      void load();
    }
  });
  void load();
  return () => {
    active = false;
    cancelLoading(root);
    unsubscribe();
    unbindRecovery();
    window.removeEventListener('offline', handleOffline);
    disposeBio?.();
    disposePosts?.();
    dialog?.destroy();
    setRefreshNotice(null);
  };
}
