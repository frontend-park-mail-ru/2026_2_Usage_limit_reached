import profileTemplate from './profile.hbs';
import postsListTemplate from '../../components/postsList/postsList.hbs';
import postCardTemplate from '../../components/postCard/postCard.hbs';
import sortMenuTemplate from '../../components/sortMenu/sortMenu.hbs';
import { requireElement } from '../../utils/helpers/dom.ts';
import { formatDraftDate, formatPostDate } from '../../utils/helpers/posts.ts';
import {
  checkSession,
  getSessionContext,
  getSessionVersion,
  isSessionCurrent,
  loadProfilePosts,
  runSessionRequest,
} from '../../modules/auth/auth.actions.ts';
import type { SessionContext } from '../../modules/auth/auth.types.ts';
import { deletePost, getMyDrafts } from '../../modules/api/posts.ts';
import type { PostPreview, PostsPage, PostsSort } from '../../modules/api/posts.types.ts';
import type { Profile } from '../../modules/api/profile.types.ts';
import type { SavedProfile, SavedPosts } from '../../modules/offline/offline.types.ts';
import { captureOfflineToken, readOfflineCopy } from '../../modules/offline/offline.storage.ts';
import { bindOfflineRecovery, isBackendUnavailable } from '../../modules/offline/offline.recovery.ts';
import { ApiError } from '../../modules/api/request.ts';
import { htmlToText } from '../../modules/sanitize/sanitize.ts';
import { AVATAR_PLACEHOLDER } from '../../modules/profile/profile.constants.ts';
import { ActionMenu } from '../../components/actionMenu/actionMenu.ts';
import { ConfirmDialog } from '../../components/confirmDialog/confirmDialog.ts';
import { SortMenu } from '../../components/sortMenu/sortMenu.ts';
import { Tabs } from '../../components/tabs/tabs.ts';
import { showToast } from '../../components/toast/toast.ts';
import { postEditRoute, postRoute } from '../../app/paths.ts';
import type { Navigate } from '../../app/paths.ts';
import type { RouteParams } from '../../app/router.types.ts';
import type { SetRefreshNotice } from '../../components/refreshNotice/refreshNotice.types.ts';
import {
  DRAFT_DELETED_MESSAGE,
  DRAFT_DELETE_ERROR,
  DRAFT_MENU_ITEMS,
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
 * Данные карточки поста или черновика.
 * @param item
 * @param tab
 */
function buildCard(item: PostPreview, tab: ProfileTab) {
  const isDraft = tab === 'drafts';
  const date = item.published_or_updated_at ?? '';
  return {
    id: item.id,
    href: isDraft ? postEditRoute(item.id) : postRoute(item.id),
    preview: item.locked ? '' : htmlToText(item.body_preview),
    title: item.title,
    isDraft,
    likesCount: item.likes_count,
    date,
    dateLabel: date ? (isDraft ? formatDraftDate(date) : formatPostDate(date)) : '',
    menuId: `draft-menu-${item.id}`,
    menuItems: DRAFT_MENU_ITEMS,
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
  const dialog = new ConfirmDialog(requireElement<HTMLDialogElement>(root, '.confirm-dialog'));
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
    const page = tab === 'posts'
      ? await loadProfilePosts(query, current)
      : await runSessionRequest(context, () => getMyDrafts(query));
    return current() ? page : undefined;
  };

  const removeDraft = async (card: HTMLElement): Promise<string | null> => {
    if (!isActive()) {
      return null;
    }
    const id = request;
    try {
      const deleted = await runSessionRequest(context, async () => {
        await deletePost(card.dataset.postId ?? '');
        return true;
      });
      if (!deleted) {
        return null;
      }
    } catch (error) {
      if (!isActive() || id !== request || (error instanceof ApiError && error.isUnauthorized)) {
        return null;
      }
      if (error instanceof ApiError && error.isCsrfError) {
        return error.text;
      }
      if (!(error instanceof ApiError) || error.status !== 404) {
        return DRAFT_DELETE_ERROR;
      }
    }
    if (!isActive() || id !== request || !card.isConnected) {
      return null;
    }
    card.remove();
    showToast(DRAFT_DELETED_MESSAGE);
    if (!panel.querySelector('.post-card')) {
      void load();
    }
    return null;
  };
  const bindCards = (container: ParentNode) => {
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
          dialog.open(requireElement(card, '.post-card__title').textContent ?? '', () => removeDraft(card));
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
        return;
      }
      cursor = page.next_cursor;
      const holder = document.createElement('div');
      holder.innerHTML = page.items.map((item) => postCardTemplate(buildCard(item, tab))).join('');
      bindCards(holder);
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
      cards: page.items.map((item) => buildCard(item, tab)),
      hasMore: !!cursor,
    });
    createButton.hidden = isEmpty && tab === 'posts';
    bindCards(panel);
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
  const retry = () => { void load(); };
  const showRetry = () => {
    needsRetry = true;
    setRefreshNotice({ pending: busy }, retry);
  };
  const showError = (message: string) => {
    disposePosts?.();
    disposePosts = undefined;
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
        disposePosts?.();
        disposePosts = undefined;
        root.innerHTML = renderProfile();
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
      root.innerHTML = profileTemplate(buildProfileViewModel(profile));
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
  void load();
  return () => {
    active = false;
    disposePosts?.();
    unbind();
    setRefreshNotice(null);
  };
}
