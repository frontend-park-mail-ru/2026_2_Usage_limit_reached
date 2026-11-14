import postTemplate from './post.hbs';
import { requireElement } from '@/utils/helpers/dom.ts';
import { formatPostDate } from '@/utils/helpers/posts.ts';
import { getPostReturnPath, withPostReturnPath } from '@/utils/helpers/postNavigation.ts';
import {
  checkSession,
  getSessionContext,
  getSessionVersion,
  isSessionCurrent,
  runSessionMutation,
} from '@/modules/auth/auth.actions.ts';
import { authStore } from '@/modules/auth/auth.store.ts';
import type { SessionContext } from '@/modules/auth/auth.types.ts';
import { deletePost, getPost } from '@/modules/api/posts.ts';
import type { Post } from '@/modules/api/posts.types.ts';
import { ApiError } from '@/modules/api/request.ts';
import { sanitizeHtml } from '@/modules/sanitize/sanitize.ts';
import { AVATAR_PLACEHOLDER } from '@/modules/profile/profile.constants.ts';
import { bindAvatarFallback } from '@/modules/profile/avatarFallback.ts';
import { ActionMenu } from '@/components/actionMenu/actionMenu.ts';
import { ConfirmDialog } from '@/components/confirmDialog/confirmDialog.ts';
import { DonateDialog } from '@/components/donateDialog/donateDialog.ts';
import { LikeButton } from '@/components/likeButton/likeButton.ts';
import { sendLike } from '@/components/likeButton/sendLike.ts';
import { showToast } from '@/components/toast/toast.ts';
import { ROUTES, matchRoute, postEditRoute, publicProfileRoute } from '@/app/paths.ts';
import type { Navigate } from '@/app/paths.ts';
import type { RouteParams } from '@/app/router.types.ts';
import {
  DELETED_MESSAGE,
  DELETE_ERROR,
  DELETE_NETWORK_ERROR,
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
 * Возвращает назад по истории, если на страницу пришли из профиля или ленты.
 * @param root
 */
function bindBackLink(root: HTMLElement): void {
  const link = requireElement<HTMLAnchorElement>(root, '[data-back]');
  const returnTo = getPostReturnPath();
  const pattern = matchRoute(returnTo.split('?')[0])?.pattern;
  const fromProfile = pattern === ROUTES.profile || pattern === ROUTES.publicProfile;
  link.href = returnTo;
  link.textContent = fromProfile ? '← Профиль' : '← Лента';
  link.addEventListener('click', (event) => {
    if (!event.defaultPrevented && event.button === 0
      && !event.ctrlKey && !event.metaKey && !event.shiftKey && !event.altKey
      && history.state?.from === returnTo) {
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
      navigate(withPostReturnPath(postEditRoute(post.id), getPostReturnPath()));
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
  const unbindAvatarFallback = bindAvatarFallback(root);
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
      navigate(withPostReturnPath(postEditRoute(post.id), getPostReturnPath()), { replace: true });
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
    unbindAvatarFallback();
    disposeActions?.();
  };
}
