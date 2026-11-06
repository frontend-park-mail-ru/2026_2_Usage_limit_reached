import postTemplate from './post.hbs';
import { requireElement } from '../../utils/helpers/dom.ts';
import { formatPostDate } from '../../utils/helpers/posts.ts';
import {
  checkSession,
  getSessionContext,
  isSessionCurrent,
  runSessionMutation,
  runSessionRequest,
} from '../../modules/auth/auth.actions.ts';
import type { SessionContext } from '../../modules/auth/auth.types.ts';
import { deletePost, getPost, setPostLike } from '../../modules/api/posts.ts';
import type { Post, PostLikes } from '../../modules/api/posts.types.ts';
import { ApiError } from '../../modules/api/request.ts';
import { sanitizeHtml } from '../../modules/sanitize/sanitize.ts';
import { AVATAR_PLACEHOLDER } from '../../modules/profile/profile.constants.ts';
import { ActionMenu } from '../../components/actionMenu/actionMenu.ts';
import { ConfirmDialog } from '../../components/confirmDialog/confirmDialog.ts';
import { DonateDialog } from '../../components/donateDialog/donateDialog.ts';
import { LikeButton } from '../../components/likeButton/likeButton.ts';
import { showToast } from '../../components/toast/toast.ts';
import { ROUTES, postEditRoute } from '../../app/paths.ts';
import type { Navigate } from '../../app/paths.ts';
import type { RouteParams } from '../../app/router.types.ts';
import {
  DELETED_MESSAGE,
  DELETE_ERROR,
  DELETE_NETWORK_ERROR,
  LIKE_ERROR,
  LOADING_MESSAGE,
  LOAD_ERROR,
  POST_MENU_ITEMS,
} from './post.constants.ts';

/** Возвращает каркас с текстом загрузки. */
export function renderPost(): string {
  return postTemplate({ message: LOADING_MESSAGE });
}

/**
 * Данные поста для шаблона.
 * @param post
 * @param isOwner
 */
function buildViewModel(post: Post, isOwner: boolean) {
  const publishedAt = post.published_at ?? '';
  return {
    authorName: post.author.nickname,
    avatarUrl: post.author.avatar_url ?? AVATAR_PLACEHOLDER,
    publishedAt,
    dateLabel: publishedAt ? formatPostDate(publishedAt) : '',
    title: post.title,
    likesCount: post.likes_count,
    liked: post.liked_by_user,
    isOwner,
    menuItems: POST_MENU_ITEMS,
  };
}

/**
 * Возвращает назад по истории, если на страницу пришли из профиля.
 * @param root
 */
function bindBackLink(root: HTMLElement): void {
  requireElement(root, '[data-back]').addEventListener('click', (event) => {
    if (history.state?.from === ROUTES.profile) {
      event.preventDefault();
      history.back();
    }
  });
}

/**
 * Удаляет пост и возвращает текст ошибки или null.
 * @param id
 * @param navigate
 * @param context
 * @param isActive
 */
async function removePost(id: string, navigate: Navigate, context: SessionContext, isActive: () => boolean): Promise<string | null> {
  try {
    const deleted = await runSessionMutation(context, async () => {
      try {
        await deletePost(id);
      } catch (error) {
        if (!(error instanceof ApiError) || error.status !== 404) {
          throw error;
        }
      }
      return true;
    });
    if (!deleted || !isActive()) {
      return null;
    }
  } catch (err) {
    if (!isActive() || !isSessionCurrent(context)) {
      return null;
    }
    if (!(err instanceof ApiError)) {
      throw err;
    }
    if (err.status === 401) {
      return null;
    }
    if (err.status !== 404) {
      return err.status === 0 ? DELETE_NETWORK_ERROR : DELETE_ERROR;
    }
  }
  showToast(DELETED_MESSAGE);
  navigate(ROUTES.profile);
  return null;
}

/**
 * Подключает меню автора и окно удаления.
 * @param root
 * @param post
 * @param navigate
 */
function bindOwnerActions(root: HTMLElement, post: Post, navigate: Navigate): void {
  const context = getSessionContext();
  if (!context || context.userId !== post.author.id) {
    return;
  }
  const page = root.firstElementChild;
  const isActive = () => root.firstElementChild === page;
  const dialog = new ConfirmDialog(requireElement<HTMLDialogElement>(root, '.confirm-dialog'));
  new ActionMenu(requireElement<HTMLElement>(root, '.post-page__menu'), (action) => {
    if (action === 'edit') {
      navigate(postEditRoute(post.id));
    } else if (action === 'delete') {
      dialog.open(post.title, () => removePost(post.id, navigate, context, isActive));
    }
  });
}

/**
 * Подключает кнопку «Пожертвовать».
 * @param root
 * @param post
 * @param isGuest
 * @param navigate
 */
function bindDonate(root: HTMLElement, post: Post, isGuest: boolean, navigate: Navigate): void {
  const dialog = new DonateDialog(requireElement<HTMLDialogElement>(root, '.donate-dialog'));
  requireElement(root, '[data-donate]').addEventListener('click', () => {
    if (isGuest) {
      navigate(ROUTES.login);
    } else {
      dialog.open(post.author);
    }
  });
}

/**
 * Отправляет лайк только для актуальной сессии и страницы.
 * @param id
 * @param liked
 * @param context
 * @param isActive
 */
async function sendLike(
  id: string,
  liked: boolean,
  context: SessionContext,
  isActive: () => boolean
): Promise<PostLikes | null> {
  if (!isActive() || !isSessionCurrent(context)) {
    return null;
  }
  try {
    const result = await runSessionRequest(context, () => setPostLike(id, liked));
    return isActive() && isSessionCurrent(context) ? result ?? null : null;
  } catch (err) {
    if (!isActive() || !isSessionCurrent(context)) {
      return null;
    }
    if (!(err instanceof ApiError)) {
      throw err;
    }
    if (err.status !== 401) {
      showToast(err.status === 0 ? err.text : LIKE_ERROR);
    }
    return null;
  }
}

/**
 * Подключает кнопку лайка.
 * @param root
 * @param post
 * @param isGuest
 * @param navigate
 */
function bindLike(root: HTMLElement, post: Post, isGuest: boolean, navigate: Navigate): void {
  const button = requireElement<HTMLButtonElement>(root, '.like-button');
  if (isGuest) {
    button.addEventListener('click', () => navigate(ROUTES.login));
    return;
  }
  const context = getSessionContext();
  if (!context) {
    button.disabled = true;
    return;
  }
  const page = root.firstElementChild;
  const isActive = () => root.firstElementChild === page;
  const state = {
    likes_count: post.likes_count,
    liked_by_user: post.liked_by_user,
  };
  new LikeButton(button, state, (liked) => sendLike(post.id, liked, context, isActive));
}

/**
 * Загружает пост и показывает его.
 * @param root
 * @param navigate
 * @param params
 */
export async function initPost(root: HTMLElement, navigate: Navigate, params: RouteParams): Promise<void> {
  const loadingPage = root.firstElementChild;
  let post: Post;
  let isOwner = false;
  let isGuest = true;
  try {
    const [loaded, profile] = await Promise.all([getPost(params.id ?? ''), checkSession().catch(() => undefined)]);
    post = loaded;
    isOwner = !!profile && profile.user.id === post.author.id;
    isGuest = !profile;
  } catch (err) {
    if (root.firstElementChild !== loadingPage) {
      return;
    }
    const isMissing = err instanceof ApiError && (err.status === 400 || err.status === 404);
    root.innerHTML = isMissing
      ? postTemplate({ unavailable: true })
      : postTemplate({ message: err instanceof ApiError && err.status === 0 ? err.text : LOAD_ERROR, isError: true });
    if (isMissing) {
      bindBackLink(root);
    }
    return;
  }
  if (root.firstElementChild !== loadingPage) {
    return;
  }
  if (isOwner && post.status !== 'published') {
    navigate(postEditRoute(post.id), { replace: true });
    return;
  }
  document.title = post.title;
  root.innerHTML = postTemplate(buildViewModel(post, isOwner));
  requireElement(root, '[data-post-body]').innerHTML = sanitizeHtml(post.body);
  bindBackLink(root);
  bindLike(root, post, isGuest, navigate);
  if (isOwner) {
    bindOwnerActions(root, post, navigate);
  } else {
    bindDonate(root, post, isGuest, navigate);
  }
}
