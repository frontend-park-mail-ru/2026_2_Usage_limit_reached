import postTemplate from './post.hbs';
import { requireElement } from '@/utils/helpers/dom.ts';
import { formatPostDate } from '@/utils/helpers/posts.ts';
import {
  checkSession,
  getSessionContext,
  getSessionVersion,
  isSessionCurrent,
  runSessionMutation,
  runSessionRequest,
} from '@/modules/auth/auth.actions.ts';
import { authStore } from '@/modules/auth/auth.store.ts';
import type { SessionContext } from '@/modules/auth/auth.types.ts';
import { deletePost, getPost, setPostLike } from '@/modules/api/posts.ts';
import type { Post, PostLikes } from '@/modules/api/posts.types.ts';
import { ApiError } from '@/modules/api/request.ts';
import { sanitizeHtml } from '@/modules/sanitize/sanitize.ts';
import { AVATAR_PLACEHOLDER } from '@/modules/profile/profile.constants.ts';
import { ActionMenu } from '@/components/actionMenu/actionMenu.ts';
import { ConfirmDialog } from '@/components/confirmDialog/confirmDialog.ts';
import { DonateDialog } from '@/components/donateDialog/donateDialog.ts';
import { LikeButton } from '@/components/likeButton/likeButton.ts';
import { showToast } from '@/components/toast/toast.ts';
import { ROUTES, matchRoute, postEditRoute, publicProfileRoute } from '@/app/paths.ts';
import type { Navigate } from '@/app/paths.ts';
import type { RouteParams } from '@/app/router.types.ts';
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
    authorHref: publicProfileRoute(post.author.username),
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
  const link = requireElement<HTMLAnchorElement>(root, '[data-back]');
  const from = history.state?.from;
  const origin = typeof from === 'string' ? matchRoute(from.split('?')[0])?.pattern : undefined;
  if (origin === ROUTES.feed) {
    link.href = ROUTES.feed;
    link.textContent = '← Лента';
  }
  link.addEventListener('click', (event) => {
    if (origin === ROUTES.profile || origin === ROUTES.publicProfile || origin === ROUTES.feed) {
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
        if (!(error instanceof ApiError) || error.isCsrfError || error.status !== 404) {
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
    if (err.isUnauthorized) {
      return null;
    }
    if (err.isCsrfError || err.isMutationTimeout) {
      return err.text;
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
 * @param beforeAction
 */
function bindOwnerActions(root: HTMLElement, post: Post, navigate: Navigate, beforeAction: () => boolean): (() => void) | undefined {
  const context = getSessionContext();
  if (!context || context.userId !== post.author.id) {
    return;
  }
  const page = root.firstElementChild;
  const isActive = () => root.firstElementChild === page;
  const dialog = new ConfirmDialog(requireElement<HTMLDialogElement>(root, '.confirm-dialog'));
  const menu = new ActionMenu(requireElement<HTMLElement>(root, '.post-page__menu'), (action) => {
    if (!beforeAction()) {
      return;
    }
    if (action === 'edit') {
      navigate(postEditRoute(post.id));
    } else if (action === 'delete') {
      dialog.open(post.title, () => removePost(post.id, navigate, context, isActive));
    }
  });
  return () => {
    menu.destroy();
    dialog.destroy();
  };
}

/**
 * Подключает кнопку «Пожертвовать».
 * @param root
 * @param post
 * @param beforeAction
 * @param isSessionValid
 */
function bindDonate(root: HTMLElement, post: Post, beforeAction: () => boolean, isSessionValid: () => boolean): () => void {
  const dialog = new DonateDialog(requireElement<HTMLDialogElement>(root, '.donate-dialog'), isSessionValid);
  requireElement(root, '[data-donate]').addEventListener('click', () => {
    if (beforeAction()) {
      dialog.open(post.author);
    }
  });
  return () => dialog.destroy();
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
    if (!err.isUnauthorized) {
      showToast(err.isCsrfError || err.isMutationTimeout || err.status === 0 ? err.text : LIKE_ERROR);
    }
    return null;
  }
}

/**
 * Подключает кнопку лайка.
 * @param root
 * @param post
 * @param beforeAction
 */
function bindLike(root: HTMLElement, post: Post, beforeAction: () => boolean): void {
  const button = requireElement<HTMLButtonElement>(root, '.like-button');
  const context = getSessionContext();
  if (!context) {
    button.addEventListener('click', beforeAction);
    return;
  }
  const page = root.firstElementChild;
  const isActive = () => root.firstElementChild === page;
  const state = {
    likes_count: post.likes_count,
    liked_by_user: post.liked_by_user,
  };
  new LikeButton(button, state, (liked) => beforeAction()
    ? sendLike(post.id, liked, context, isActive)
    : Promise.resolve(null));
}

/**
 * Загружает пост и показывает его.
 * @param root
 * @param navigate
 * @param params
 */
export function initPost(root: HTMLElement, navigate: Navigate, params: RouteParams): () => void {
  let active = true;
  let request = 0;
  let disposeActions: (() => void) | undefined;
  let renderedSession: string | undefined;
  const sessionKey = () => {
    const { status, user } = authStore.getState();
    return status + (user?.id ?? '');
  };

  const load = async () => {
    const id = ++request;
    const isCurrent = () => active && request === id;
    disposeActions?.();
    disposeActions = undefined;
    renderedSession = undefined;
    root.innerHTML = renderPost();

    await checkSession().catch(() => undefined);
    if (!isCurrent()) {
      return;
    }
    const version = getSessionVersion();
    let post: Post;
    try {
      post = await getPost(params.id ?? '');
    } catch (error) {
      if (!isCurrent()) {
        return;
      }
      const status = error instanceof ApiError ? error.status : undefined;
      const restricted = status === 403;
      const unavailable = restricted || status === 400 || status === 404;
      root.innerHTML = unavailable
        ? postTemplate({ unavailable: true, restricted })
        : postTemplate({ message: error instanceof ApiError && error.status === 0 ? error.text : LOAD_ERROR, isError: true });
      if (unavailable) {
        renderedSession = sessionKey();
        bindBackLink(root);
      }
      return;
    }
    if (!isCurrent()) {
      return;
    }
    if (version !== getSessionVersion()) {
      void load();
      return;
    }

    const context = getSessionContext();
    const isOwner = context?.userId === post.author.id;
    if (isOwner && post.status !== 'published') {
      navigate(postEditRoute(post.id), { replace: true });
      return;
    }
    const beforeAction = () => {
      if (!isCurrent()) {
        return false;
      }
      if (authStore.getState().status === 'guest') {
        navigate(ROUTES.login);
        return false;
      }
      if (context && isSessionCurrent(context)) {
        return true;
      }
      showToast('Не удалось подтвердить сессию. Проверяем её ещё раз');
      void load();
      return false;
    };

    renderedSession = sessionKey();
    document.title = post.title;
    if (post.locked) {
      root.innerHTML = postTemplate({ unavailable: true, restricted: true });
      bindBackLink(root);
      return;
    }
    root.innerHTML = postTemplate(buildViewModel(post, isOwner));
    requireElement(root, '[data-post-body]').innerHTML = sanitizeHtml(post.body);
    bindBackLink(root);
    bindLike(root, post, beforeAction);
    disposeActions = isOwner
      ? bindOwnerActions(root, post, navigate, beforeAction)
      : bindDonate(root, post, beforeAction, () => !!context && isSessionCurrent(context));
  };

  const unsubscribe = authStore.subscribe(() => {
    if (active && (authStore.getState().status === 'unknown'
      || (renderedSession !== undefined && renderedSession !== sessionKey()))) {
      void load();
    }
  });
  void load();

  return () => {
    active = false;
    unsubscribe();
    disposeActions?.();
  };
}
