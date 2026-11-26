import { setLoadingText, startLoading, cancelLoading } from '@/utils/helpers/delayedLoading.ts';
import postsListTemplate from '@/components/postsList/postsList.hbs';
import postCardTemplate from '@/components/postCard/postCard.hbs';
import sortMenuTemplate from '@/components/sortMenu/sortMenu.hbs';
import { SortMenu } from '@/components/sortMenu/sortMenu.ts';
import { publicProfileRoute } from '@/app/paths.ts';
import type { PostPreview, PostsQuery, PostsSort } from '@/modules/api/posts.types.ts';
import type { OfflinePostsPage } from '@/modules/offline/offline.pages.ts';
import { bindOfflineRecovery, isBackendUnavailable, watchOfflineExpiry } from '@/modules/offline/offline.recovery.ts';
import { getOfflineDeadline } from '@/modules/offline/offline.deadline.ts';
import { expireOfflinePublications } from '@/modules/offline/offline.storage.ts';
import { AVATAR_PLACEHOLDER } from '@/modules/profile/profile.constants.ts';
import { requireElement } from '@/utils/helpers/dom.ts';
import { buildPostCard } from '@/components/postCard/buildPostCard.ts';
import { bindPostCardCovers } from '@/components/postCard/bindPostCardCovers.ts';
import { LIST_LOADING_MESSAGE, POST_SORT_OPTIONS } from './postsList.constants.ts';
import type { SetRefreshNotice } from '@/components/refreshNotice/refreshNotice.types.ts';

/**
 * Подключает сортировку и подгрузку опубликованных постов.
 * @param root
 * @param loadPage
 * @param bindLike
 * @param feed
 * @param offlineEnabled
 * @param readOnly
 * @param setRefreshNotice
 * @param onlineOnly Текущая выдача доступна только онлайн.
 */
export function bindPublicPosts(
  root: HTMLElement,
  loadPage: (query: PostsQuery, isCurrent: () => boolean) => Promise<OfflinePostsPage>,
  bindLike?: (button: HTMLButtonElement, item: PostPreview) => void,
  feed = false,
  offlineEnabled = feed,
  readOnly = false,
  setRefreshNotice: SetRefreshNotice = () => {},
  onlineOnly = () => false,
) {
  const panel = requireElement<HTMLElement>(root, '[data-public-posts]');
  const unbindCovers = bindPostCardCovers(panel);
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
  let retryAction: (() => void) | undefined;
  const expiry = watchOfflineExpiry(() => {
    if (!offline) {
      return undefined;
    }
    let next = Infinity;
    let expired = false;
    panel.querySelectorAll<HTMLElement>('[data-offline-preview]').forEach((element) => {
      const deadline = getOfflineDeadline(element.dataset.offlinePreview);
      if (deadline === undefined) {
        element.textContent = '';
        delete element.dataset.offlinePreview;
        expired = true;
      } else {
        next = Math.min(next, deadline);
      }
    });
    if (expired) {
      void expireOfflinePublications(() => active);
    }
    return Number.isFinite(next) ? next : undefined;
  });

  const observer = new IntersectionObserver((entries) => {
    if (entries.some((entry) => entry.isIntersecting)) {
      void load(true);
    }
  }, { rootMargin: '200px' });

  async function load(append = false): Promise<void> {
    if (!active || (append && (busy || cursor === null))) {
      return;
    }
    const id = ++request;
    const next = append ? cursor : null;
    busy = true;
    observer.disconnect();
    if (retryAction) {
      setRefreshNotice({ pending: true }, retryAction);
    }
    if (!append) {
      cancelLoading(panel);
      cursor = null;
      offline = readOnly;
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
        panel.querySelectorAll<HTMLButtonElement>('.like-button').forEach((button) => { button.disabled = true; });
      }
      const cards = page.items.map((item) => ({
        ...buildPostCard(item),
        offlineDeadline: item.body_preview ? item.offline_cache_until ?? 'invalid' : undefined,
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
          publicProfile: !feed, feed, cards, isEmpty: cards.length === 0 && cursor === null, hasMore: cursor !== null,
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
      expiry.refresh();
      const more = panel.querySelector<HTMLElement>('[data-posts-more]');
      retryAction = offline ? () => { void load(); } : undefined;
      if (more) {
        more.hidden = cursor === null;
        if (cursor !== null) {
          observer.observe(more);
        }
      }
    } catch (error) {
      if (!active || id !== request) {
        return;
      }
      unavailable = isBackendUnavailable(error);
      offline ||= !onlineOnly() && offlineEnabled && unavailable;
      if (offline) {
        panel.querySelectorAll<HTMLButtonElement>('.like-button').forEach((button) => { button.disabled = true; });
        expiry.refresh();
      }
      const message = onlineOnly() && !navigator.onLine ? 'Результаты недоступны без интернета'
        : append ? 'Не удалось загрузить ещё публикации' : 'Не удалось загрузить публикации';
      if (moreText) {
        moreText.textContent = message;
      } else {
        panel.innerHTML = postsListTemplate({ message, isError: true });
      }
      retryAction = () => { void load(append && !offline); };
    } finally {
      stopLoading();
      if (id === request) {
        busy = false;
        setRefreshNotice(retryAction ? { pending: false } : null, retryAction);
        if (recoverAfterLoad) {
          recoverAfterLoad = false;
          if (active && (unavailable || offline)) {
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
  const unbindRecovery = bindOfflineRecovery(() => {
    if (busy) {
      recoverAfterLoad = true;
    } else {
      void load();
    }
  }, () => offlineEnabled && active && unavailable);
  const handleOffline = () => {
    if (offlineEnabled && active) {
      if (onlineOnly()) {
        void load();
        return;
      }
      unavailable = true;
      offline = true;
      panel.querySelectorAll<HTMLButtonElement>('.like-button').forEach((button) => { button.disabled = true; });
      expiry.refresh();
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
      setRefreshNotice(null);
      window.removeEventListener('offline', handleOffline);
      unbindRecovery();
      expiry.destroy();
      unbindCovers();
      observer.disconnect();
      sortMenu.destroy();
    },
  };
}
