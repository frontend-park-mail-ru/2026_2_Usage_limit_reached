import { setLoadingText, startLoading, cancelLoading } from '@/utils/helpers/delayedLoading.ts';
import postsListTemplate from '@/components/postsList/postsList.hbs';
import postCardTemplate from '@/components/postCard/postCard.hbs';
import sortMenuTemplate from '@/components/sortMenu/sortMenu.hbs';
import { SortMenu } from '@/components/sortMenu/sortMenu.ts';
import { publicProfileRoute } from '@/app/paths.ts';
import type { PostPreview, PostsQuery, PostsSort } from '@/modules/api/posts.types.ts';
import type { OfflinePostsPage } from '@/modules/offline/offline.pages.ts';
import { bindOfflineRecovery, isBackendUnavailable } from '@/modules/offline/offline.recovery.ts';
import { ApiError } from '@/modules/api/request.ts';
import { AVATAR_PLACEHOLDER } from '@/modules/profile/profile.constants.ts';
import { requireElement } from '@/utils/helpers/dom.ts';
import { buildPostCard } from '@/components/postCard/buildPostCard.ts';
import { LIST_ERROR, LIST_LOADING_MESSAGE, POST_SORT_OPTIONS } from './postsList.constants.ts';

/**
 * Подключает сортировку и подгрузку опубликованных постов.
 * @param root
 * @param loadPage
 * @param bindLike
 * @param feed
 * @param offlineEnabled
 * @param readOnly
 */
export function bindPublicPosts(
  root: HTMLElement,
  loadPage: (query: PostsQuery, isCurrent: () => boolean) => Promise<OfflinePostsPage>,
  bindLike?: (button: HTMLButtonElement, item: PostPreview) => void,
  feed = false,
  offlineEnabled = feed,
  readOnly = false,
) {
  const panel = requireElement<HTMLElement>(root, '[data-public-posts]');
  const retry = requireElement<HTMLButtonElement>(root, '[data-list-retry]');
  const sortRoot = requireElement<HTMLElement>(root, '[data-public-sort]');
  const options = POST_SORT_OPTIONS.map((option) => ({ ...option, selected: option.value === 'new' }));
  sortRoot.innerHTML = sortMenuTemplate({ id: feed ? 'feed-sort' : 'public-profile-sort', currentLabel: options[0].label, options });
  let sort: PostsSort = 'new';
  let cursor: string | null = null;
  let request = 0;
  let busy = false;
  let active = true;
  let offline = readOnly;
  let unavailable = false;
  let recoverAfterLoad = false;
  const notice = root.querySelector<HTMLElement>('[data-offline-notice]');

  const observer = new IntersectionObserver((entries) => {
    if (entries.some((entry) => entry.isIntersecting)) {
      void load(true);
    }
  }, { rootMargin: '200px' });

  async function load(append = false): Promise<void> {
    if (!active || (append && (busy || !cursor))) {
      return;
    }
    const id = ++request;
    const next = append ? cursor : null;
    busy = true;
    observer.disconnect();
    retry.hidden = true;
    if (!append) {
      cancelLoading(panel);
      cursor = null;
      offline = readOnly;
      if (notice) {
        notice.hidden = true;
      }
      panel.innerHTML = postsListTemplate({ message: LIST_LOADING_MESSAGE });
    }
    const moreText = panel.querySelector<HTMLElement>('[data-posts-more-text]');
    const stopLoading = moreText ? setLoadingText(moreText, LIST_LOADING_MESSAGE) : startLoading(panel);
    try {
      const page = await loadPage({ sort, cursor: next }, () => active && id === request);
      if (!active || id !== request) {
        return;
      }
      cursor = page.next_cursor;
      unavailable = page.savedAt !== undefined;
      offline ||= page.savedAt !== undefined;
      if (page.savedAt !== undefined) {
        if (notice) {
          notice.textContent = 'Сохранённая копия. Доступен только просмотр';
          notice.hidden = false;
        }
        panel.querySelectorAll<HTMLButtonElement>('.like-button').forEach((button) => { button.disabled = true; });
        retry.hidden = false;
      }
      const cards = page.items.map((item) => ({
        ...buildPostCard(item),
        hasLikesCount: item.hasLikesCount ?? item.likes_count !== undefined,
        locked: item.locked,
        offline,
        canLike: !offline && !!bindLike && !item.locked,
        liked: item.liked_by_user,
        feedAuthor: feed ? {
          name: item.author.nickname, avatarUrl: item.author.avatar_url ?? AVATAR_PLACEHOLDER, href: publicProfileRoute(item.author.username),
        } : undefined,
      }));
      let previousCount = 0;
      if (append) {
        const grid = requireElement(panel, '[data-posts-grid]');
        previousCount = grid.children.length;
        grid.insertAdjacentHTML(
          'beforeend', cards.map((card) => postCardTemplate(card)).join('')
        );
        if (moreText) {
          moreText.textContent = '';
        }
      } else {
        panel.innerHTML = postsListTemplate({
          publicProfile: !feed, feed, cards, isEmpty: cards.length === 0 && !cursor, hasMore: !!cursor,
        });
      }
      if (!offline && bindLike && cards.length > 0) {
        const grid = requireElement(panel, '[data-posts-grid]');
        page.items.forEach((item, index) => {
          const button = grid.children[previousCount + index]?.querySelector<HTMLButtonElement>('.post-card__like');
          if (button) {
            bindLike(button, item);
          }
        });
      }
      const more = panel.querySelector<HTMLElement>('[data-posts-more]');
      if (more) {
        more.hidden = !cursor;
        if (cursor) {
          observer.observe(more);
        }
      }
    } catch (error) {
      if (!active || id !== request) {
        return;
      }
      offline ||= offlineEnabled && isBackendUnavailable(error);
      unavailable = isBackendUnavailable(error);
      if (offline) {
        panel.querySelectorAll<HTMLButtonElement>('.like-button').forEach((button) => { button.disabled = true; });
      }
      const message = error instanceof ApiError && error.code === 'offline_copy_missing'
        ? 'Не удалось загрузить публикации. Сохранённой копии этой страницы нет. Попробуйте ещё раз'
        : error instanceof ApiError && error.code === 'offline_storage_unavailable'
          ? 'Не удалось загрузить публикации или открыть сохранённую копию. Попробуйте ещё раз'
          : LIST_ERROR;
      if (moreText) {
        moreText.textContent = message;
      } else {
        panel.innerHTML = postsListTemplate({ message, isError: true });
      }
      retry.hidden = false;
    } finally {
      stopLoading();
      if (id === request) {
        busy = false;
        if (recoverAfterLoad) {
          recoverAfterLoad = false;
          if (active && unavailable) {
            void load();
          }
        }
      }
    }
  }

  const sortMenu = new SortMenu(requireElement(sortRoot, '.sort-menu'), (value) => {
    const option = POST_SORT_OPTIONS.find((item) => item.value === value);
    if (option) {
      sort = option.value;
      void load();
    }
  });
  retry.addEventListener('click', () => { void load(!!cursor && !offline); });
  const unbindRecovery = bindOfflineRecovery(() => {
    if (busy) {
      recoverAfterLoad = true;
    } else {
      void load();
    }
  }, () => offlineEnabled && active && unavailable);
  const handleOffline = () => {
    if (offlineEnabled && active) {
      unavailable = true;
      offline = true;
      panel.querySelectorAll<HTMLButtonElement>('.like-button').forEach((button) => { button.disabled = true; });
      if (!busy) {
        void load();
      }
    }
  };
  window.addEventListener('offline', handleOffline);
  void load();
  return {
    reload: () => { void load(); },
    destroy: () => {
      cancelLoading(panel);
      active = false;
      window.removeEventListener('offline', handleOffline);
      unbindRecovery();
      observer.disconnect();
      sortMenu.destroy();
    },
  };
}
