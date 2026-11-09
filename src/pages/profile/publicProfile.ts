import profileTemplate from './publicProfile.hbs';
import { bindProfileBio } from '@/components/profileBio/profileBio.ts';
import postsListTemplate from '@/components/postsList/postsList.hbs';
import postCardTemplate from '@/components/postCard/postCard.hbs';
import sortMenuTemplate from '@/components/sortMenu/sortMenu.hbs';
import { DonateDialog } from '@/components/donateDialog/donateDialog.ts';
import { SortMenu } from '@/components/sortMenu/sortMenu.ts';
import { showToast } from '@/components/toast/toast.ts';
import { checkSession, getSessionContext } from '@/modules/auth/auth.actions.ts';
import { getPublicProfile } from '@/modules/api/profile.ts';
import { getPublicPosts } from '@/modules/api/posts.ts';
import type { PostsSort } from '@/modules/api/posts.types.ts';
import { ApiError } from '@/modules/api/request.ts';
import { AVATAR_PLACEHOLDER } from '@/modules/profile/profile.constants.ts';
import { ROUTES } from '@/app/paths.ts';
import type { Navigate } from '@/app/paths.ts';
import type { RouteParams } from '@/app/router.types.ts';
import { requireElement } from '@/utils/helpers/dom.ts';
import { buildProfilePostCard } from './profile.ts';
import { LIST_ERROR, LIST_LOADING_MESSAGE, LOAD_ERROR, LOADING_MESSAGE, SORT_OPTIONS } from './profile.constants.ts';

/** Показывает состояние загрузки публичного профиля. */
export function renderPublicProfile(): string {
  return profileTemplate({ message: LOADING_MESSAGE });
}

/**
 * Загружает опубликованные посты автора и следующие страницы.
 * @param root
 * @param username
 */
function bindPublicPosts(root: HTMLElement, username: string): () => void {
  const panel = requireElement<HTMLElement>(root, '[data-public-posts]');
  const retry = requireElement<HTMLButtonElement>(root, '[data-list-retry]');
  const sortRoot = requireElement<HTMLElement>(root, '[data-public-sort]');
  const options = SORT_OPTIONS.posts.map((option) => ({ ...option, selected: option.value === 'new' }));
  sortRoot.innerHTML = sortMenuTemplate({ id: 'public-profile-sort', currentLabel: options[0].label, options });
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
      const page = await getPublicPosts(username, { sort, cursor: next });
      if (!active || id !== request) {
        return;
      }
      cursor = page.next_cursor;
      const cards = page.items.map((item) => ({
        ...buildProfilePostCard(item, 'posts'), locked: item.locked,
      }));
      if (append) {
        requireElement(panel, '[data-posts-grid]').insertAdjacentHTML(
          'beforeend', cards.map((card) => postCardTemplate(card)).join('')
        );
        if (moreText) {
          moreText.textContent = '';
        }
      } else {
        panel.innerHTML = postsListTemplate({
          publicProfile: true, cards, isEmpty: cards.length === 0 && !cursor, hasMore: !!cursor,
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
    const option = SORT_OPTIONS.posts.find((item) => item.value === value);
    if (option) {
      sort = option.value;
      void load();
    }
  });
  retry.addEventListener('click', () => { void load(!!cursor); });
  void load();
  return () => {
    active = false;
    observer.disconnect();
    sortMenu.destroy();
  };
}

/**
 * Показывает профиль и подключает действия посетителя.
 * @param root
 * @param navigate
 * @param params
 */
export function initPublicProfile(root: HTMLElement, navigate: Navigate, params: RouteParams): () => void {
  let active = true;
  let disposePosts: (() => void) | undefined;
  let dialog: DonateDialog | undefined;
  let disposeBio: (() => void) | undefined;

  async function load(): Promise<void> {
    root.innerHTML = renderPublicProfile();
    try {
      const { user, author } = await getPublicProfile(params.username);
      if (!active) {
        return;
      }
      document.title = user.nickname;
      root.innerHTML = profileTemplate({
        name: user.nickname, username: `@${user.username}`, avatarUrl: user.avatar_url ?? AVATAR_PLACEHOLDER,
        bio: author?.bio, isAuthor: !!author,
      });
      disposeBio = bindProfileBio(root);
      if (author) {
        disposePosts = bindPublicPosts(root, params.username);
        const donate = requireElement<HTMLButtonElement>(root, '[data-donate]');
        const donateDialog = new DonateDialog(requireElement(root, '.donate-dialog'));
        dialog = donateDialog;
        const updateDonate = () => { donate.hidden = getSessionContext()?.userId === user.id; };
        void checkSession().then(updateDonate, updateDonate);
        donate.addEventListener('click', async () => {
          donate.disabled = true;
          try {
            const viewer = await checkSession();
            if (!active) {
              return;
            }
            if (!viewer) {
              navigate(ROUTES.login);
            } else if (viewer.user.id !== user.id) {
              donateDialog.open(user);
            }
            updateDonate();
          } catch (error) {
            if (active) {
              if (error instanceof ApiError && error.isUnauthorized) {
                navigate(ROUTES.login);
              } else {
                showToast(error instanceof ApiError ? error.text : LOAD_ERROR);
              }
            }
          } finally {
            donate.disabled = false;
          }
        });
      }
    } catch (error) {
      if (active) {
        disposeBio?.();
        const missing = error instanceof ApiError && error.status === 404;
        root.innerHTML = profileTemplate({
          message: missing ? 'Профиль не найден' : LOAD_ERROR, isError: true, canRetry: !missing,
        });
        root.querySelector('[data-profile-retry]')?.addEventListener('click', () => { void load(); });
      }
    }
  }
  void load();
  return () => {
    active = false;
    disposeBio?.();
    disposePosts?.();
    dialog?.destroy();
  };
}
