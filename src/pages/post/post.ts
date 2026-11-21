import { startLoading, cancelLoading } from '@/utils/helpers/delayedLoading.ts';
import postTemplate from './post.hbs';
import { requireElement } from '@/utils/helpers/dom.ts';
import { formatPostDate } from '@/utils/helpers/posts.ts';
import { getAttachmentUrl } from '@/utils/helpers/attachments.ts';
import { getPostReturnPath, withPostReturnPath } from '@/utils/helpers/postNavigation.ts';
import {
  checkSession,
  getSessionContext,
  getSessionVersion,
  isSessionCurrent,
  runSessionMutation,
} from '@/modules/auth/auth.actions.ts';
import { authStore } from '@/modules/auth/auth.store.ts';
import { loadOfflinePost } from '@/modules/offline/offline.pages.ts';
import { bindOfflineRecovery } from '@/modules/offline/offline.recovery.ts';
import type { SessionContext } from '@/modules/auth/auth.types.ts';
import { deletePost, getPost } from '@/modules/api/posts.ts';
import type { Post } from '@/modules/api/posts.types.ts';
import { ApiError } from '@/modules/api/request.ts';
import { sanitizeHtml } from '@/modules/sanitize/sanitize.ts';
import { bindPostAttachments } from './postAttachments.ts';
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
import type { SetRefreshNotice } from '@/components/refreshNotice/refreshNotice.types.ts';
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
  return postTemplate({ message: LOADING_MESSAGE, loading: true });
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
      dialog.open(post.title, () => beforeAction() ? removePost(post.id, navigate, context, isActive) : Promise.resolve(null));
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
function bindDonate(root: HTMLElement, post: Post, beforeAction: () => boolean, isSessionValid: () => boolean): DonateDialog {
  const dialog = new DonateDialog(requireElement<HTMLDialogElement>(root, '.donate-dialog'), isSessionValid);
  requireElement(root, '[data-donate]').addEventListener('click', () => {
    if (beforeAction()) {
      dialog.open(post.author);
    }
  });
  return dialog;
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
export function initPost(root: HTMLElement, navigate: Navigate, params: RouteParams, setRefreshNotice: SetRefreshNotice): () => void {
  const unbindAvatarFallback = bindAvatarFallback(root);
  let active = true;
  let request = 0;
  let disposeActions: (() => void) | undefined;
  let disposeBody: (() => void) | undefined;
  let renderedSession: string | undefined;
  let offline = false;
  let needsRetry = false;
  let busy = false;
  let recoverAfterLoad = false;
  let donateDialog: DonateDialog | undefined;
  const sessionKey = () => {
    const { status, user } = authStore.getState();
    return status + (user?.id ?? '');
  };

  const load = async () => {
    const id = ++request;
    busy = true;
    setRefreshNotice(needsRetry ? { pending: true } : null, () => { void load(); });
    const isCurrent = () => active && request === id;
    disposeBody?.();
    disposeBody = undefined;
    disposeActions?.();
    disposeActions = undefined;
    donateDialog = undefined;
    renderedSession = undefined;
    cancelLoading(root);
    root.innerHTML = renderPost();

    const stopLoading = startLoading(root);
    try {
      await checkSession().catch(() => undefined);
      if (!isCurrent()) {
        return;
      }
      const version = getSessionVersion();
      let post: Post;
      let hasOfflineAttachments: boolean;
      try {
        const result = await loadOfflinePost(params.id ?? '', () => getPost(params.id ?? ''),
          () => isCurrent() && version === getSessionVersion());
        post = result;
        offline = result.savedAt !== undefined;
        hasOfflineAttachments = !!result.hasAttachments;
        needsRetry = offline;
      } catch (error) {
        if (!isCurrent()) {
          return;
        }
        const status = error instanceof ApiError ? error.status : undefined;
        needsRetry = !(error instanceof ApiError && [400, 401, 403, 404].includes(error.status));
        const restricted = status === 403;
        const unavailable = restricted || status === 400 || status === 404;
        root.innerHTML = unavailable
          ? postTemplate({ unavailable: true, restricted })
          : postTemplate({ message: LOAD_ERROR, isError: true });
        bindBackLink(root);
        if (unavailable) {
          renderedSession = sessionKey();
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
        if (!isCurrent() || offline) {
          return false;
        }
        if (authStore.getState().status === 'guest') {
          navigate(ROUTES.login);
          return false;
        }
        if (context && isSessionCurrent(context)) {
          return true;
        }
        showToast('Не удалось подтвердить сессию. Проверяем её ещё раз', 'error');
        void load();
        return false;
      };

      renderedSession = sessionKey();
      document.title = post.title;
      if (post.locked) {
        const lockedCoverUrl = !offline && post.cover_url ? getAttachmentUrl(post.cover_url) : null;
        const showRestricted = () => {
          root.innerHTML = postTemplate({ unavailable: true, restricted: true });
          bindBackLink(root);
        };
        if (!lockedCoverUrl) {
          showRestricted();
          return;
        }
        root.innerHTML = postTemplate({ ...buildViewModel(post, false), lockedCoverUrl });
        requireElement(root, '.post-page__cover').addEventListener('error', () => {
          if (isCurrent()) {
            showRestricted();
          }
        }, { once: true });
        bindBackLink(root);
        return;
      }
      root.innerHTML = postTemplate({ ...buildViewModel(post, isOwner && !offline), offline });
      const body = requireElement<HTMLElement>(root, '[data-post-body]');
      body.innerHTML = sanitizeHtml(post.body, !offline);
      bindBackLink(root);
      if (offline) {
        if (hasOfflineAttachments || !body.textContent?.trim()) {
          const message = document.createElement('p');
          message.className = 'post-page__attachment_unavailable';
          message.textContent = hasOfflineAttachments
            ? 'Вложения доступны после подключения к интернету'
            : 'Содержимое поста недоступно без интернета';
          body.append(message);
        }
        return;
      }
      disposeBody = bindPostAttachments(body, post.attachments ?? []);
      bindLike(root, post, beforeAction);
      if (isOwner) {
        disposeActions = bindOwnerActions(root, post, navigate, beforeAction);
      } else {
        donateDialog = bindDonate(root, post, beforeAction, () => !!context && isSessionCurrent(context));
        const currentDialog = donateDialog;
        disposeActions = () => currentDialog.destroy();
      }
    } finally {
      stopLoading();
      if (id === request) {
        busy = false;
        setRefreshNotice(needsRetry ? { pending: false } : null, () => { void load(); });
        if (recoverAfterLoad) {
          recoverAfterLoad = false;
          if (active && needsRetry) {
            void load();
          }
        }
      }
    }
  };

  const unsubscribe = authStore.subscribe(() => {
    if (active && (authStore.getState().status === 'unknown'
      || (renderedSession !== undefined && renderedSession !== sessionKey()))) {
      void load();
    }
  });
  const unbindRecovery = bindOfflineRecovery(() => {
    if (busy) {
      recoverAfterLoad = true;
    } else {
      void load();
    }
  }, () => active && needsRetry && !root.querySelector('dialog[open]'));
  const handleOffline = () => {
    offline = true;
    needsRetry = true;
    donateDialog?.setReadOnly(true);
    root.querySelectorAll<HTMLButtonElement>('.like-button, [data-donate], .post-page__menu button')
      .forEach((button) => { button.disabled = true; });
    setRefreshNotice({ pending: busy }, () => { void load(); });
  };
  window.addEventListener('offline', handleOffline);
  void load();

  return () => {
    active = false;
    cancelLoading(root);
    unbindRecovery();
    window.removeEventListener('offline', handleOffline);
    unsubscribe();
    unbindAvatarFallback();
    disposeBody?.();
    disposeActions?.();
    setRefreshNotice(null);
  };
}
