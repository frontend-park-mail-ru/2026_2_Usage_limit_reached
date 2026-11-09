import { buildPostCard } from '@/components/postCard/buildPostCard.ts';
import profileTemplate from './profile.hbs';
import { bindProfileBio } from '@/components/profileBio/profileBio.ts';
import { LikeButton } from '@/components/likeButton/likeButton.ts';
import { sendLike } from '@/components/likeButton/sendLike.ts';
import { POST_MENU_ITEMS } from '@/components/postCard/postCard.constants.ts';
import { profileStore } from '@/modules/profile/profile.store.ts';
import postsListTemplate from '@/components/postsList/postsList.hbs';
import postCardTemplate from '@/components/postCard/postCard.hbs';
import sortMenuTemplate from '@/components/sortMenu/sortMenu.hbs';
import { requireElement } from '@/utils/helpers/dom.ts';
import { formatPostDate } from '@/utils/helpers/posts.ts';
import {
  checkSession,
  getSessionContext,
  getSessionVersion,
  isSessionCurrent,
  loadProfilePosts,
  runSessionRequest,
  runSessionMutation,
} from '@/modules/auth/auth.actions.ts';
import type { SessionContext } from '@/modules/auth/auth.types.ts';
import { deletePost, getMyDrafts } from '@/modules/api/posts.ts';
import type { PostPreview, PostsPage, PostsSort } from '@/modules/api/posts.types.ts';
import type { Profile } from '@/modules/api/profile.types.ts';
import type { SavedProfile, SavedPosts } from '@/modules/offline/offline.types.ts';
import { captureOfflineToken, readOfflineCopy } from '@/modules/offline/offline.storage.ts';
import { bindOfflineRecovery, isBackendUnavailable } from '@/modules/offline/offline.recovery.ts';
import { ApiError } from '@/modules/api/request.ts';
import { htmlToText } from '@/modules/sanitize/sanitize.ts';
import { AVATAR_PLACEHOLDER } from '@/modules/profile/profile.constants.ts';
import { ActionMenu } from '@/components/actionMenu/actionMenu.ts';
import { ConfirmDialog } from '@/components/confirmDialog/confirmDialog.ts';
import { SortMenu } from '@/components/sortMenu/sortMenu.ts';
import { Tabs } from '@/components/tabs/tabs.ts';
import { showToast } from '@/components/toast/toast.ts';
import { postEditRoute } from '@/app/paths.ts';
import type { Navigate } from '@/app/paths.ts';
import type { RouteParams } from '@/app/router.types.ts';
import type { SetRefreshNotice } from '@/components/refreshNotice/refreshNotice.types.ts';
import {
  POST_DELETED_MESSAGE,
  POST_DELETE_ERROR,
  DRAFT_DELETED_MESSAGE,
  DRAFT_DELETE_ERROR,
  LIST_ERROR,
  LIST_LOADING_MESSAGE,
  LOADING_MESSAGE,
  PROFILE_TABS,
  SORT_OPTIONS,
} from './profile.constants.ts';
import type { ProfileTab } from './profile.types.ts';

/**
 * Готовит профиль и сохранённый список для шаблона.
 * Онлайн список загружается отдельно, offline используются только сохранённые данные.
 * @param profile
 * @param posts
 * @param offline
 */
export function buildProfileViewModel(
  profile: Profile | SavedProfile | undefined,
  posts?: Pick<SavedPosts, 'items' | 'next_cursor'>,
  offline = false
) {
  const cards = (posts?.items ?? []).map((item) => {
    const date = item.published_or_updated_at ?? '';
    return {
      id: item.id,
      title: item.title,
      preview: item.locked ? '' : htmlToText(item.body_preview),
      date,
      dateLabel: date ? formatPostDate(date) : '',
      offline: true,
    };
  });
  const avatarUrl = profile && 'avatar_url' in profile.user
    ? profile.user.avatar_url
    : undefined;
  const needsPayout = !offline && !!profile?.author
    && 'payout_provider' in profile.author
    && !profile.author.payout_provider;

  return {
    name: profile?.user.nickname ?? '',
    username: profile ? `@${profile.user.username}` : '',
    hasAuthor: !!profile?.author,
    bio: profile?.author?.bio ?? '',
    avatarUrl: avatarUrl ?? AVATAR_PLACEHOLDER,
    needsPayout,
    tabs: PROFILE_TABS.map((item, index) => ({ ...item, selected: index === 0 })),
    postCountLabel: `Загружено: ${cards.length}`,
    hasMorePosts: !!posts?.next_cursor,
    profileMissing: !profile,
    postsMissing: !posts,
    showPosts: offline || !!profile?.author,
    isEmpty: cards.length === 0,
    cards,
    offline,
  };
}

/**
 * Подключает вкладки и списки аккаунта, возвращает очистку обработчиков.
 * Первая страница уже загружена, повторно запрашивать её не нужно.
 * @param root
 * @param navigate
 * @param context
 * @param initialPage
 * @param setRefreshNotice
 */
function bindPosts(
  root: HTMLElement,
  navigate: Navigate,
  context: SessionContext,
  initialPage: PostsPage,
  setRefreshNotice: SetRefreshNotice
): () => void {
  const panel = requireElement<HTMLElement>(root, '[data-profile-panel]');
  const sortRoot = requireElement<HTMLElement>(root, '[data-profile-sort]');
  const createButton = requireElement<HTMLElement>(root, '[data-create-post]');
  const dialog = new ConfirmDialog(requireElement<HTMLDialogElement>(root, '#draft-delete-dialog'), true);
  const postDialog = new ConfirmDialog(requireElement<HTMLDialogElement>(root, '#post-delete-dialog'), true);
  let active = true;
  let tab: ProfileTab = 'posts';
  let sort: PostsSort = 'new';
  let cursor: string | null = null;
  let request = 0;
  let busy = false;
  let retryAction: (() => void) | undefined;
  let sortMenu: SortMenu | undefined;
  let cardMenus: ActionMenu[] = [];
  let observer: IntersectionObserver | undefined;
  const pendingLikes = new Set<ReturnType<typeof sendLike>>();
  const isActive = () => active && panel.isConnected && isSessionCurrent(context);
  const setRetry = (action?: () => void) => {
    retryAction = action;
    setRefreshNotice(action ? { pending: busy } : null, action);
  };
  const clearList = () => {
    observer?.disconnect();
    observer = undefined;
    for (const menu of cardMenus) {
      menu.destroy();
    }
    cardMenus = [];
  };
  const fetchPage = async (pageCursor: string | null, id: number) => {
    const current = () => isActive() && id === request;
    const query = { sort, ...(pageCursor ? { cursor: pageCursor } : {}) };
    if (pendingLikes.size > 0) {
      await Promise.allSettled([...pendingLikes]);
    }
    if (!current()) {
      return undefined;
    }
    const page = tab === 'posts'
      ? await loadProfilePosts(query, current)
      : await runSessionRequest(context, () => getMyDrafts(query));
    return current() ? page : undefined;
  };

  const buildCard = (item: PostPreview) => ({
    ...buildPostCard(item, tab === 'drafts'),
    canLike: tab === 'posts' && !item.locked,
    liked: item.liked_by_user,
    canManage: tab === 'posts' && item.author.id === context.userId,
    ...(tab === 'posts' ? { menuId: `post-menu-${item.id}`, menuItems: POST_MENU_ITEMS } : {}),
  });
  const removeCard = async (card: HTMLElement, isDraft: boolean): Promise<string | null> => {
    if (!isActive()) {
      return null;
    }
    const previous = context;
    const listVersion = request;
    try {
      const deleted = await runSessionMutation(previous, async () => {
        try {
          await deletePost(card.dataset.postId ?? '');
        } catch (error) {
          if (!(error instanceof ApiError) || error.isCsrfError || error.status !== 404) {
            throw error;
          }
        }
        return true;
      });
      const current = getSessionContext();
      if (!deleted || !active || !panel.isConnected || !current || current.userId !== previous.userId) {
        return null;
      }
      context = current;
      showToast(isDraft ? DRAFT_DELETED_MESSAGE : POST_DELETED_MESSAGE);
      if (listVersion !== request || !card.isConnected) {
        await load(true);
      } else {
        card.remove();
        if (!panel.querySelector('.post-card')) {
          await load();
        }
      }
      return null;
    } catch (error) {
      if (!active || !panel.isConnected) {
        return null;
      }
      const current = getSessionContext();
      if (current && current.userId === previous.userId && error instanceof ApiError && error.isMutationResponseTimeout) {
        context = current;
      } else if (!isSessionCurrent(previous)) {
        return null;
      }
      if (error instanceof ApiError && (error.isCsrfError || error.isMutationTimeout || error.status === 0)) {
        return error.text;
      }
      return isDraft ? DRAFT_DELETE_ERROR : POST_DELETE_ERROR;
    }
  };
  const bindCards = (container: ParentNode, items: PostPreview[]) => {
    const cards = container.querySelectorAll<HTMLElement>('.post-card');
    items.forEach((item, index) => {
      const card = cards[index];
      const button = card?.querySelector<HTMLButtonElement>('.post-card__like');
      if (button) {
        new LikeButton(button, item, async (liked) => {
          const request = sendLike(item.id, liked, context, () => isActive() && card.isConnected);
          pendingLikes.add(request);
          try {
            return await request;
          } finally {
            pendingLikes.delete(request);
          }
        });
      }
    });
    for (const menuRoot of container.querySelectorAll<HTMLElement>('.post-card__menu')) {
      const card = menuRoot.closest<HTMLElement>('.post-card');
      if (!card) {
        continue;
      }
      cardMenus.push(new ActionMenu(menuRoot, (action) => {
        if (!isActive()) {
          return;
        }
        if (action === 'edit') {
          navigate(postEditRoute(card.dataset.postId ?? ''));
        } else if (action === 'delete') {
          const title = requireElement(card, '.post-card__title').textContent ?? '';
          if (tab === 'drafts') {
            dialog.open(title, () => removeCard(card, true));
          } else {
            postDialog.open(title, () => removeCard(card, false));
          }
        }
      }));
    }
  };

  const loadMore = async () => {
    const more = panel.querySelector<HTMLElement>('[data-posts-more]');
    const grid = panel.querySelector<HTMLElement>('[data-posts-grid]');
    if (!isActive() || busy || !cursor || !more || !grid) {
      return;
    }
    const id = request;
    const text = requireElement(more, '[data-posts-more-text]');
    const retryButton = requireElement<HTMLButtonElement>(more, '[data-posts-retry]');
    busy = true;
    if (retryAction) {
      setRefreshNotice({ pending: true }, retryAction);
    }
    text.textContent = LIST_LOADING_MESSAGE;
    retryButton.hidden = true;
    try {
      const page = await fetchPage(cursor, id);
      if (!page) {
        if (isActive() && id === request) {
          text.textContent = LIST_ERROR;
          retryButton.hidden = false;
          setRetry(() => { void loadMore(); });
        }
        return;
      }
      cursor = page.next_cursor;
      const holder = document.createElement('div');
      holder.innerHTML = page.items.map((item) => postCardTemplate(buildCard(item))).join('');
      bindCards(holder, page.items);
      grid.append(...holder.children);
      text.textContent = '';
      more.hidden = !cursor;
      observer?.unobserve(more);
      if (cursor) {
        observer?.observe(more);
      }
      setRetry();
    } catch (error) {
      if (!isActive() || id !== request || (error instanceof ApiError && error.isUnauthorized)) {
        return;
      }
      if (error instanceof ApiError && error.status === 403) {
        clearList();
        panel.innerHTML = postsListTemplate({ message: error.text, isError: true });
        cursor = null;
      } else {
        text.textContent = LIST_ERROR;
        retryButton.hidden = false;
      }
      setRetry(() => { void (cursor ? loadMore() : load()); });
    } finally {
      if (isActive() && id === request) {
        busy = false;
        if (retryAction) {
          setRefreshNotice({ pending: false }, retryAction);
        }
      }
    }
  };
  const watchMore = () => {
    const more = panel.querySelector<HTMLElement>('[data-posts-more]');
    if (!more || !cursor) {
      return;
    }
    observer = new IntersectionObserver((entries) => {
      if (isActive() && !retryAction && entries.some((entry) => entry.isIntersecting)) {
        void loadMore();
      }
    }, { rootMargin: '200px' });
    observer.observe(more);
    requireElement(more, '[data-posts-retry]').addEventListener('click', () => { void loadMore(); });
  };
  const showList = (page: PostsPage) => {
    clearList();
    cursor = page.next_cursor;
    const isEmpty = page.items.length === 0;
    panel.innerHTML = postsListTemplate({
      isEmpty,
      isDrafts: tab === 'drafts',
      cards: page.items.map(buildCard),
      hasMore: !!cursor,
    });
    createButton.hidden = false;
    bindCards(panel, page.items);
    watchMore();
  };

  async function load(reset = false): Promise<void> {
    if (!isActive() || (busy && !reset)) {
      return;
    }
    const id = ++request;
    busy = true;
    if (reset) {
      clearList();
      cursor = null;
      panel.innerHTML = postsListTemplate({ message: LIST_LOADING_MESSAGE });
    }
    if (retryAction) {
      setRefreshNotice({ pending: true }, retryAction);
    }
    try {
      const page = await fetchPage(null, id);
      if (page) {
        showList(page);
        setRetry();
      }
    } catch (error) {
      if (!isActive() || id !== request || (error instanceof ApiError && error.isUnauthorized)) {
        return;
      }
      if (!isBackendUnavailable(error) || !panel.querySelector('[data-posts-grid], .posts-list__empty')) {
        const message = error instanceof ApiError ? error.text : LIST_ERROR;
        panel.innerHTML = postsListTemplate({ message, isError: true });
      }
      setRetry(() => { void load(); });
    } finally {
      if (isActive() && id === request) {
        busy = false;
        if (retryAction) {
          setRefreshNotice({ pending: false }, retryAction);
        }
      }
    }
  }

  const renderSort = () => {
    sortMenu?.destroy();
    const options = SORT_OPTIONS[tab].map((option) => ({ ...option, selected: option.value === sort }));
    const current = options.find((option) => option.selected) ?? options[0];
    sortRoot.innerHTML = sortMenuTemplate({ id: 'profile-sort', currentLabel: current?.label, options });
    sortMenu = new SortMenu(requireElement<HTMLElement>(sortRoot, '.sort-menu'), (value) => {
      const selected = options.find((option) => option.value === value);
      if (isActive() && selected) {
        sort = selected.value;
        void load(true);
      }
    });
  };
  const tabs = new Tabs(requireElement<HTMLElement>(root, '.tabs'), (value) => {
    if (!isActive()) {
      return;
    }
    tab = value === 'drafts' ? 'drafts' : 'posts';
    sort = 'new';
    panel.setAttribute('aria-labelledby', `profile-tabs-tab-${tab}`);
    createButton.hidden = false;
    renderSort();
    void load(true);
  });
  const unbindRecovery = bindOfflineRecovery(() => retryAction?.(), () => isActive() && !!retryAction && !busy);
  panel.setAttribute('aria-labelledby', 'profile-tabs-tab-posts');
  renderSort();
  showList(initialPage);
  return () => {
    active = false;
    request += 1;
    clearList();
    sortMenu?.destroy();
    tabs.destroy();
    dialog.destroy();
    postDialog.destroy();
    unbindRecovery();
    setRefreshNotice(null);
  };
}

/** Возвращает каркас профиля с текстом загрузки. */
export function renderProfile(): string {
  return profileTemplate({ message: LOADING_MESSAGE, loading: true });
}

/**
 * Загружает профиль и подключает восстановление до ухода со страницы.
 * @param root
 * @param navigate
 * @param _params
 * @param setRefreshNotice
 */
export function initProfile(root: HTMLElement, navigate: Navigate, _params: RouteParams, setRefreshNotice: SetRefreshNotice): () => void {
  let active = true;
  let busy = false;
  let needsRetry = false;
  let displayedOwnerId: string | undefined;
  let disposePosts: (() => void) | undefined;
  let disposeBio: (() => void) | undefined;
  const render = (html: string) => {
    disposeBio?.();
    root.innerHTML = html;
    disposeBio = bindProfileBio(root);
  };
  const retry = () => { void load(); };
  const showRetry = () => {
    needsRetry = true;
    setRefreshNotice({ pending: busy }, retry);
  };
  const showError = (message: string) => {
    disposePosts?.();
    disposePosts = undefined;
    render(profileTemplate({ message, isError: true }));
    displayedOwnerId = undefined;
    showRetry();
  };
  const load = async (savedProfile?: Profile) => {
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
      profile = savedProfile ?? await checkSession();
      if (!active) {
        return;
      }
      const context = getSessionContext();
      if (!profile || !context || context.userId !== profile.user.id) {
        return;
      }
      version = getSessionVersion();
      if (displayedOwnerId && displayedOwnerId !== context.userId) {
        disposePosts?.();
        disposePosts = undefined;
        render(renderProfile());
        displayedOwnerId = undefined;
      }
      const posts = profile.author ? await loadProfilePosts(undefined, () => active) : undefined;
      if (!active || !isSessionCurrent(context)) {
        return;
      }
      if (profile.author && !posts) {
        showError('Данные аккаунта изменились. Попробуйте снова');
        return;
      }
      disposePosts?.();
      disposePosts = undefined;
      render(profileTemplate(buildProfileViewModel(profile)));
      displayedOwnerId = context.userId;
      needsRetry = false;
      setRefreshNotice(null);
      if (posts) {
        disposePosts = bindPosts(root, navigate, context, posts, setRefreshNotice);
      }
    } catch (error) {
      if (!active || version !== getSessionVersion()) {
        return;
      }
      if (!isBackendUnavailable(error)) {
        showError(error instanceof ApiError ? error.text : 'Не удалось загрузить данные');
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
      disposePosts?.();
      disposePosts = undefined;
      render(profileTemplate(buildProfileViewModel(profile ?? saved?.profile, saved?.posts, true)));
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
  const saved = profileStore.getSavedNavigation();
  void load(saved && isSessionCurrent(saved.context) ? saved.profile : undefined);
  return () => {
    active = false;
    disposePosts?.();
    disposeBio?.();
    unbind();
    setRefreshNotice(null);
  };
}
