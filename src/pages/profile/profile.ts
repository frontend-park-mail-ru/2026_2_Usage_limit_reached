import profileTemplate from './profile.hbs';
import postsListTemplate from '../../components/postsList/postsList.hbs';
import postCardTemplate from '../../components/postCard/postCard.hbs';
import sortMenuTemplate from '../../components/sortMenu/sortMenu.hbs';
import { requireElement } from '../../utils/helpers/dom.ts';
import { formatDraftDate, formatPostDate } from '../../utils/helpers/posts.ts';
import { checkSession } from '../../modules/auth/auth.actions.ts';
import { deletePost, getMyDrafts, getMyPosts } from '../../modules/api/posts.ts';
import type { PostPreview, PostsPage, PostsSort } from '../../modules/api/posts.types.ts';
import type { Profile } from '../../modules/api/profile.types.ts';
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
import {
  DRAFT_DELETED_MESSAGE,
  DRAFT_DELETE_ERROR,
  DRAFT_MENU_ITEMS,
  LIST_ERROR,
  LIST_LOADING_MESSAGE,
  LOADING_MESSAGE,
  LOAD_ERROR,
  PROFILE_TABS,
  SORT_OPTIONS,
} from './profile.constants.ts';
import type { ProfileTab } from './profile.types.ts';

/**
 * Готовит шапку профиля для шаблона.
 * @param profile
 */
export function buildProfileViewModel(profile: Profile) {
  return {
    name: profile.user.nickname,
    username: `@${profile.user.username}`,
    hasAuthor: !!profile.author,
    bio: profile.author?.bio ?? '',
    avatarUrl: profile.user.avatar_url ?? AVATAR_PLACEHOLDER,
    tabs: PROFILE_TABS.map((item, index) => ({ ...item, selected: index === 0 })),
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
  let dateLabel = '';
  if (date) {
    dateLabel = isDraft ? formatDraftDate(date) : formatPostDate(date);
  }
  return {
    id: item.id,
    href: isDraft ? postEditRoute(item.id) : postRoute(item.id),
    preview: htmlToText(item.body_preview),
    title: item.title,
    isDraft,
    likesCount: item.likes_count,
    date,
    dateLabel,
    menuId: `draft-menu-${item.id}`,
    menuItems: DRAFT_MENU_ITEMS,
  };
}

/**
 * Подключает вкладки, сортировку, списки и удаление черновиков.
 * @param root
 * @param navigate
 */
function bindPosts(root: HTMLElement, navigate: Navigate): void {
  const panel = requireElement<HTMLElement>(root, '[data-profile-panel]');
  const sortRoot = requireElement<HTMLElement>(root, '[data-profile-sort]');
  const createButton = requireElement<HTMLElement>(root, '[data-create-post]');
  const dialog = new ConfirmDialog(requireElement<HTMLDialogElement>(root, '.confirm-dialog'));
  let tab: ProfileTab = 'posts';
  let sort: PostsSort = 'new';
  let cursor: string | null = null;
  let request = 0;
  let isLoadingMore = false;
  let sortMenu: SortMenu | null = null;
  let cardMenus: ActionMenu[] = [];
  let observer: IntersectionObserver | null = null;

  const fetchPage = (pageCursor: string | null) =>
    (tab === 'posts' ? getMyPosts : getMyDrafts)({ sort, cursor: pageCursor });

  const clearList = () => {
    observer?.disconnect();
    observer = null;
    for (const menu of cardMenus) {
      menu.destroy();
    }
    cardMenus = [];
    isLoadingMore = false;
  };

  const removeDraft = async (card: HTMLElement): Promise<string | null> => {
    try {
      await deletePost(card.dataset.postId ?? '');
    } catch (err) {
      if (!(err instanceof ApiError)) {
        throw err;
      }
      if (err.status === 401) {
        return null;
      }
      if (err.status !== 404) {
        return DRAFT_DELETE_ERROR;
      }
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
    if (isLoadingMore || !cursor || !more || !grid) {
      return;
    }
    const id = request;
    const text = requireElement(more, '[data-posts-more-text]');
    const retry = requireElement<HTMLButtonElement>(more, '[data-posts-retry]');
    isLoadingMore = true;
    text.textContent = LIST_LOADING_MESSAGE;
    retry.hidden = true;
    try {
      const page = await fetchPage(cursor);
      if (id !== request) {
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
    } catch (err) {
      if (id !== request || (err instanceof ApiError && err.status === 401)) {
        return;
      }
      text.textContent = LIST_ERROR;
      retry.hidden = false;
    } finally {
      if (id === request) {
        isLoadingMore = false;
      }
    }
  };

  const watchMore = () => {
    const more = panel.querySelector<HTMLElement>('[data-posts-more]');
    if (!more || !cursor) {
      return;
    }
    observer = new IntersectionObserver((entries) => {
      if (!panel.isConnected) {
        observer?.disconnect();
      } else if (entries.some((entry) => entry.isIntersecting)) {
        void loadMore();
      }
    }, { rootMargin: '200px' });
    observer.observe(more);
    requireElement(more, '[data-posts-retry]').addEventListener('click', () => {
      void loadMore();
    });
  };

  const showList = (page: PostsPage) => {
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

  async function load(): Promise<void> {
    const id = ++request;
    clearList();
    panel.innerHTML = postsListTemplate({ message: LIST_LOADING_MESSAGE });
    try {
      const page = await fetchPage(null);
      if (id === request && panel.isConnected) {
        showList(page);
      }
    } catch (err) {
      if (id !== request || !panel.isConnected || (err instanceof ApiError && err.status === 401)) {
        return;
      }
      const message = err instanceof ApiError && err.status === 0 ? err.text : LIST_ERROR;
      panel.innerHTML = postsListTemplate({ message, isError: true });
    }
  }

  const renderSort = () => {
    sortMenu?.destroy();
    const options = SORT_OPTIONS[tab].map((option) => ({ ...option, selected: option.value === sort }));
    const current = options.find((option) => option.selected) ?? options[0];
    sortRoot.innerHTML = sortMenuTemplate({ id: 'profile-sort', currentLabel: current?.label, options });
    sortMenu = new SortMenu(requireElement<HTMLElement>(sortRoot, '.sort-menu'), (value) => {
      sort = value as PostsSort;
      void load();
    });
  };

  new Tabs(requireElement<HTMLElement>(root, '.tabs'), (value) => {
    tab = value === 'drafts' ? 'drafts' : 'posts';
    sort = 'new';
    panel.setAttribute('aria-labelledby', `profile-tabs-tab-${tab}`);
    createButton.hidden = false;
    renderSort();
    void load();
  });
  panel.setAttribute('aria-labelledby', 'profile-tabs-tab-posts');
  renderSort();
  void load();
}

/** Возвращает каркас профиля с текстом загрузки. */
export function renderProfile(): string {
  return profileTemplate({ message: LOADING_MESSAGE });
}

/**
 * Загружает профиль и показывает данные или ошибку.
 * @param root
 * @param navigate
 */
export async function initProfile(root: HTMLElement, navigate: Navigate): Promise<void> {
  const loadingPage = root.firstElementChild;
  try {
    const profile = await checkSession();
    if (!profile || root.firstElementChild !== loadingPage) {
      return;
    }
    root.innerHTML = profileTemplate(buildProfileViewModel(profile));
    if (profile.author) {
      bindPosts(root, navigate);
    }
  } catch (err) {
    if (root.firstElementChild !== loadingPage || (err instanceof ApiError && err.status === 401)) {
      return;
    }
    const message = err instanceof ApiError && err.status === 0 ? err.text : LOAD_ERROR;
    root.innerHTML = profileTemplate({ message, isError: true });
  }
}
