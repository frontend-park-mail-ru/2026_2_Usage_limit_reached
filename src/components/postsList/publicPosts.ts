import postsListTemplate from '@/components/postsList/postsList.hbs';
import postCardTemplate from '@/components/postCard/postCard.hbs';
import sortMenuTemplate from '@/components/sortMenu/sortMenu.hbs';
import { SortMenu } from '@/components/sortMenu/sortMenu.ts';
import { publicProfileRoute } from '@/app/paths.ts';
import type { PostPreview, PostsPage, PostsQuery, PostsSort } from '@/modules/api/posts.types.ts';
import { AVATAR_PLACEHOLDER } from '@/modules/profile/profile.constants.ts';
import { requireElement } from '@/utils/helpers/dom.ts';
import { buildPostCard } from '@/components/postCard/buildPostCard.ts';
import { LIST_ERROR, LIST_LOADING_MESSAGE, POST_SORT_OPTIONS } from './postsList.constants.ts';

/**
 * Подключает сортировку и подгрузку опубликованных постов.
 * @param root
 * @param loadPage
 * @param bindFeedLike
 */
export function bindPublicPosts(
  root: HTMLElement,
  loadPage: (query: PostsQuery) => Promise<PostsPage>,
  bindFeedLike?: (button: HTMLButtonElement, item: PostPreview) => void
) {
  const feed = !!bindFeedLike;
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
      cursor = null;
      panel.innerHTML = postsListTemplate({ message: LIST_LOADING_MESSAGE });
    }
    const moreText = panel.querySelector<HTMLElement>('[data-posts-more-text]');
    if (moreText) {
      moreText.textContent = LIST_LOADING_MESSAGE;
    }
    try {
      const page = await loadPage({ sort, cursor: next });
      if (!active || id !== request) {
        return;
      }
      cursor = page.next_cursor;
      const cards = page.items.map((item) => ({
        ...buildPostCard(item),
        locked: item.locked,
        canLike: feed && !item.locked,
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
      if (bindFeedLike && cards.length > 0) {
        const grid = requireElement(panel, '[data-posts-grid]');
        page.items.forEach((item, index) => {
          const button = grid.children[previousCount + index]?.querySelector<HTMLButtonElement>('.post-card__like');
          if (button) {
            bindFeedLike(button, item);
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
    } catch {
      if (!active || id !== request) {
        return;
      }
      if (moreText) {
        moreText.textContent = LIST_ERROR;
      } else {
        panel.innerHTML = postsListTemplate({ message: LIST_ERROR, isError: true });
      }
      retry.hidden = false;
    } finally {
      if (id === request) {
        busy = false;
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
  retry.addEventListener('click', () => { void load(!!cursor); });
  void load();
  return {
    reload: () => { void load(); },
    destroy: () => {
      active = false;
      observer.disconnect();
      sortMenu.destroy();
    },
  };
}
