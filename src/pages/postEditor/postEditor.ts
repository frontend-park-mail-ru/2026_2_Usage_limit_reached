import postEditorTemplate from './postEditor.hbs';
import { requireElement } from '@/utils/helpers/dom.ts';
import { checkSession, getSessionContext, isSessionCurrent, runSessionRequest, runSessionMutation } from '@/modules/auth/auth.actions.ts';
import type { SessionContext } from '@/modules/auth/auth.types.ts';
import { createPost, getPost, updatePost } from '@/modules/api/posts.ts';
import type { Post, PostStatus } from '@/modules/api/posts.types.ts';
import { ApiError } from '@/modules/api/request.ts';
import { bindValidation } from '@/modules/validation/bindForm.ts';
import { postSchema } from '@/modules/validation/schemas.ts';
import type { FormValues } from '@/modules/validation/validation.types.ts';
import { RichEditor } from '@/components/richEditor/richEditor.ts';
import { LinkDialog } from '@/components/linkDialog/linkDialog.ts';
import { Modal } from '@/components/modal/modal.ts';
import { setAlert } from '@/components/alert/alert.ts';
import { showToast } from '@/components/toast/toast.ts';
import { setLeaveGuard } from '@/app/router.ts';
import { ROUTES, postEditRoute, postRoute } from '@/app/paths.ts';
import type { Navigate } from '@/app/paths.ts';
import type { RouteParams } from '@/app/router.types.ts';
import {
  AUTHOR_ONLY_ERROR,
  CHANGES_ERROR_TITLE,
  CHANGES_SAVED_MESSAGE,
  CLEAN_STATUS,
  CONFLICT_ERROR,
  DIRTY_STATUS,
  DRAFT_ERROR_TITLE,
  DRAFT_SAVED_MESSAGE,
  EDITOR_MODES,
  LOADING_MESSAGE,
  LOAD_ERROR,
  NETWORK_ERROR,
  NOT_FOUND_ERROR,
  PUBLISHED_MESSAGE,
  PUBLISH_ERROR_TITLE,
} from './postEditor.constants.ts';
import type { EditorIntent, EditorMode, EditorSnapshot } from './postEditor.types.ts';

/** Возвращает каркас с текстом загрузки. */
export function renderPostEditor(): string {
  return postEditorTemplate({ message: LOADING_MESSAGE });
}

/**
 * Режим страницы по загруженному посту.
 * @param post
 */
function getMode(post: Post | null): EditorMode {
  if (!post) {
    return 'create';
  }
  return post.status === 'published' ? 'published' : 'draft';
}

/**
 * Данные для шаблона.
 * @param post
 */
function buildViewModel(post: Post | null) {
  const mode = getMode(post);
  return {
    ...EDITOR_MODES[mode],
    backHref: post && mode === 'published' ? postRoute(post.id) : ROUTES.profile,
    title: post?.title ?? '',
    statusText: CLEAN_STATUS[mode],
  };
}

/**
 * Статус, с которым сохраняется пост.
 * @param mode
 * @param intent
 */
function getTargetStatus(mode: EditorMode, intent: EditorIntent): PostStatus {
  return intent === 'publish' || mode === 'published' ? 'published' : 'draft';
}

/**
 * Сообщение после успешного сохранения.
 * @param status
 * @param intent
 */
function getSavedMessage(status: PostStatus, intent: EditorIntent): string {
  if (status === 'draft') {
    return DRAFT_SAVED_MESSAGE;
  }
  return intent === 'publish' ? PUBLISHED_MESSAGE : CHANGES_SAVED_MESSAGE;
}

/**
 * Заголовок плашки ошибки сохранения.
 * @param status
 * @param intent
 */
function getErrorTitle(status: PostStatus, intent: EditorIntent): string {
  if (intent === 'publish') {
    return PUBLISH_ERROR_TITLE;
  }
  return status === 'draft' ? DRAFT_ERROR_TITLE : CHANGES_ERROR_TITLE;
}

/**
 * Текст плашки по ответу backend.
 * @param err
 */
function getErrorText(err: ApiError): string {
  if (err.isCsrfError) {
    return err.text;
  }
  const texts: Record<number, string> = { 403: AUTHOR_ONLY_ERROR, 404: NOT_FOUND_ERROR, 409: CONFLICT_ERROR };
  if (err.status === 400) {
    return err.text;
  }
  return texts[err.status] ?? NETWORK_ERROR;
}

/**
 * Подключает форму, кнопки сохранения и окно ухода.
 * @param root
 * @param loaded
 * @param navigate
 * @param context
 */
function bindEditor(root: HTMLElement, loaded: Post | null, navigate: Navigate, context: SessionContext): void {
  const form = requireElement<HTMLFormElement>(root, '#post-editor-form');
  const titleInput = requireElement<HTMLInputElement>(form, '[name="title"]');
  const statusLine = requireElement<HTMLElement>(form, '[data-editor-status]');
  const alert = requireElement<HTMLElement>(form, '[data-alert]');
  const buttons = [...root.querySelectorAll<HTMLButtonElement>('[data-intent]')];
  const linkDialog = new LinkDialog(requireElement<HTMLDialogElement>(root, '.link-dialog'));
  const editor = new RichEditor(requireElement<HTMLElement>(form, '.rich-editor'), linkDialog);
  const mode = getMode(loaded);
  let post = loaded;
  let intent: EditorIntent = 'save';
  let leave: (() => void) | null = null;
  let isSaving = false;

  editor.setValue(loaded?.body ?? '');
  let saved: EditorSnapshot = { title: titleInput.value, body: editor.getValue() };

  const leaveModal = new Modal(requireElement<HTMLDialogElement>(root, '.post-editor__leave'), () => {
    leave = null;
  });

  const isDirty = () => titleInput.value !== saved.title || editor.getValue() !== saved.body;

  const updateStatus = () => {
    statusLine.textContent = isDirty() ? DIRTY_STATUS : CLEAN_STATUS[mode];
  };

  const setBusy = (busy: boolean) => {
    isSaving = busy;
    for (const button of buttons) {
      button.disabled = busy;
    }
  };

  const submit = async (values: FormValues) => {
    if (isSaving || !isSessionCurrent(context)) {
      return;
    }
    const status = getTargetStatus(mode, intent);
    const action = intent;
    const afterSave = leave;
    leave = null;
    setBusy(true);
    setAlert(alert, null);
    const data = { title: values.title.trim(), body: values.body, status };
    try {
      const save = async () => {
        if (post) {
          await updatePost(post.id, { ...data, last_updated_at: post.updated_at });
          return post.id;
        }
        return (await createPost(data)).id;
      };
      const id = status === 'published'
        ? await runSessionMutation(context, save)
        : await runSessionRequest(context, save);
      if (!form.isConnected || !id) {
        return;
      }
      saved = { title: titleInput.value, body: values.body };
      showToast(getSavedMessage(status, action));
      if (afterSave) {
        afterSave();
      } else if (status === 'published') {
        navigate(postRoute(id));
      } else if (!post) {
        navigate(postEditRoute(id), { replace: true });
      } else {
        updateStatus();
        post = await getPost(id).catch(() => post);
      }
    } catch (err) {
      if (!form.isConnected || !isSessionCurrent(context)) {
        return;
      }
      if (!(err instanceof ApiError)) {
        throw err;
      }
      if (err.isUnauthorized) {
        return;
      }
      setAlert(alert, getErrorText(err), getErrorTitle(status, action));
      alert.scrollIntoView({ block: 'nearest' });
    } finally {
      if (form.isConnected) {
        setBusy(false);
      }
    }
  };

  for (const button of buttons) {
    button.addEventListener('click', () => {
      intent = button.dataset.intent === 'publish' ? 'publish' : 'save';
    });
  }
  form.addEventListener('input', updateStatus);
  bindValidation(form, postSchema, (values) => {
    void submit(values);
  });

  requireElement(root, '[data-leave="save"]').addEventListener('click', () => {
    const go = leave;
    leaveModal.close();
    leave = go;
    intent = 'save';
    form.requestSubmit();
    if (!isSaving) {
      leave = null;
    }
  });
  requireElement(root, '[data-leave="discard"]').addEventListener('click', () => {
    const go = leave;
    leaveModal.close();
    go?.();
  });

  setLeaveGuard({
    hasChanges: isDirty,
    confirm: (go) => {
      leave = go;
      leaveModal.open();
    },
  });
}

/**
 * Загружает пост для правки или открывает пустую форму.
 * @param root
 * @param navigate
 * @param params
 */
export async function initPostEditor(root: HTMLElement, navigate: Navigate, params: RouteParams): Promise<void> {
  const loadingPage = root.firstElementChild;
  let post: Post | null = null;
  let context: SessionContext | undefined;
  try {
    const profile = await checkSession();
    if (!profile) {
      return;
    }
    context = getSessionContext();
    if (params.id) {
      post = await getPost(params.id);
      if (post.author.id !== profile.user.id) {
        root.innerHTML = postEditorTemplate({ unavailable: true });
        return;
      }
    }
  } catch (err) {
    if (root.firstElementChild !== loadingPage || (err instanceof ApiError && err.isUnauthorized)) {
      return;
    }
    if (err instanceof ApiError && (err.status === 400 || err.status === 404)) {
      root.innerHTML = postEditorTemplate({ unavailable: true });
      return;
    }
    const message = err instanceof ApiError && err.status === 0 ? err.text : LOAD_ERROR;
    root.innerHTML = postEditorTemplate({ message, isError: true });
    return;
  }
  if (root.firstElementChild !== loadingPage) {
    return;
  }
  if (!context || !isSessionCurrent(context)) {
    return;
  }
  root.innerHTML = postEditorTemplate(buildViewModel(post));
  bindEditor(root, post, navigate, context);
}
