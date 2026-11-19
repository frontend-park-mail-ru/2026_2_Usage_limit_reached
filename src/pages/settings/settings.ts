import { startLoading, cancelLoading } from '@/utils/helpers/delayedLoading.ts';
import settingsTemplate from './settings.hbs';
import { requireElement } from '@/utils/helpers/dom.ts';
import { checkSession, getSessionContext, getSessionVersion, isSessionCurrent } from '@/modules/auth/auth.actions.ts';
import { authStore } from '@/modules/auth/auth.store.ts';
import { captureOfflineToken, readOfflineCopy } from '@/modules/offline/offline.storage.ts';
import { bindOfflineRecovery, isBackendUnavailable } from '@/modules/offline/offline.recovery.ts';
import type { SavedProfile } from '@/modules/offline/offline.types.ts';
import { saveProfile, uploadAvatar, deleteAvatar, openSavedProfile } from '@/modules/profile/profile.actions.ts';
import type { SessionContext } from '@/modules/auth/auth.types.ts';
import { AVATAR_PLACEHOLDER } from '@/modules/profile/profile.constants.ts';
import type { Profile, ProfileUpdate } from '@/modules/api/profile.types.ts';
import { ApiError } from '@/modules/api/request.ts';
import { bindValidation } from '@/modules/validation/bindForm.ts';
import { authorSettingsSchema, userSettingsSchema } from '@/modules/validation/schemas.ts';
import { BIO_MAX } from '@/modules/validation/schemas.constants.ts';
import type { FormValues } from '@/modules/validation/validation.types.ts';
import { validateAvatar } from '@/modules/validation/avatar.ts';
import { AVATAR_ERROR } from '@/modules/validation/avatar.constants.ts';
import { Select } from '@/components/select/select.ts';
import { Modal } from '@/components/modal/modal.ts';
import { AvatarCropper } from '@/components/avatarCropper/avatarCropper.ts';
import { showToast } from '@/components/toast/toast.ts';
import { setAlert } from '@/components/alert/alert.ts';
import type { Navigate } from '@/app/paths.ts';
import type { RouteParams } from '@/app/router.types.ts';
import type { SetRefreshNotice } from '@/components/refreshNotice/refreshNotice.types.ts';
import {
  AVATAR_DELETED_MESSAGE,
  AVATAR_DELETE_ERROR,
  AVATAR_OPEN_ERROR,
  AVATAR_SAVED_MESSAGE,
  LOADING_MESSAGE,
  LOAD_ERROR,
  PROFILE_CATEGORIES,
  SAVED_MESSAGE,
  SAVE_NETWORK_ERROR,
} from './settings.constants.ts';

/** Возвращает каркас с текстом загрузки. */
export function renderSettings(): string {
  return settingsTemplate({ message: LOADING_MESSAGE, loading: true });
}

/**
 * Данные профиля для шаблона.
 * @param profile
 */
function buildSettingsViewModel(profile: Profile | SavedProfile) {
  const category = profile.author?.category ?? '';
  const categories = [...new Set([...(category ? [category] : []), ...PROFILE_CATEGORIES])];
  return {
    nickname: profile.user.nickname,
    username: profile.user.username,
    avatarUrl: ('avatar_url' in profile.user && profile.user.avatar_url) || AVATAR_PLACEHOLDER,
    hasAvatar: 'avatar_url' in profile.user && !!profile.user.avatar_url,
    isAuthor: !!profile.author,
    category,
    bio: profile.author?.bio ?? '',
    bioMax: BIO_MAX,
    categories: categories.map((value) => ({ value, selected: value === category })),
  };
}

/**
 * Тело запроса из формы.
 * @param profile
 * @param values
 */
function buildProfileUpdate(profile: Profile, values: FormValues): ProfileUpdate {
  const data: ProfileUpdate = { nickname: values.nickname };
  const author = profile.author;
  const category = values.category || null;
  if (author && (values.bio !== author.bio || category !== (author.category ?? null))) {
    data.author = { bio: values.bio, category };
  }
  return data;
}

/**
 * Сохраняет профиль.
 * @param root
 * @param profile
 * @param values
 * @param navigate
 * @param context
 */
async function submitSettings(root: HTMLElement, profile: Profile, values: FormValues, navigate: Navigate, context: SessionContext): Promise<void> {
  const form = requireElement<HTMLFormElement>(root, '#settings-form');
  const button = requireElement<HTMLButtonElement>(form, 'button[type="submit"]');
  const alert = requireElement<HTMLElement>(root, '.settings__save-error');
  if (button.matches(':disabled') || !isSessionCurrent(context)) {
    return;
  }
  button.disabled = true;
  setAlert(alert, null);

  try {
    const saved = await saveProfile(buildProfileUpdate(profile, values), context);
    if (!saved || !form.isConnected || !isSessionCurrent(saved.context)) {
      return;
    }
    showToast(SAVED_MESSAGE);
    openSavedProfile(saved, navigate);
  } catch (err) {
    if (!form.isConnected || (!isSessionCurrent(context) && !(err instanceof ApiError && err.isMutationResponseTimeout))) {
      return;
    }
    if (!(err instanceof ApiError)) {
      throw err;
    }
    if (err.isUnauthorized) {
      return;
    }
    setAlert(alert, err.status === 0 && !err.isCsrfError && !err.isMutationTimeout ? SAVE_NETWORK_ERROR : err.text);
  } finally {
    if (form.isConnected) {
      button.disabled = !isSessionCurrent(context);
    }
  }
}

/**
 * Подключает смену и удаление фото.
 * @param root
 * @param context
 */
function bindAvatar(root: HTMLElement, context: SessionContext): () => void {
  const form = requireElement<HTMLFormElement>(root, '#settings-form');
  const isActive = () => form.isConnected && isSessionCurrent(context)
    && !root.querySelector<HTMLFieldSetElement>('[data-settings-fields]')?.disabled;
  const avatar = requireElement<HTMLImageElement>(root, '[data-avatar]');
  const deleteButton = requireElement<HTMLButtonElement>(root, '[data-avatar-delete]');
  const hint = requireElement<HTMLElement>(root, '[data-avatar-hint]');
  const hintText = hint.textContent ?? '';
  const fileInput = requireElement<HTMLInputElement>(root, '[data-avatar-file]');
  const pickerAlert = requireElement<HTMLElement>(root, '.settings__picker-error');
  const applyButton = requireElement<HTMLButtonElement>(root, '[data-avatar-apply]');
  const cropper = new AvatarCropper(requireElement<HTMLElement>(root, '.avatar-cropper'));
  const picker = new Modal(requireElement<HTMLDialogElement>(root, '.settings__modal-picker'), () => {
    fileInput.value = '';
  });
  const crop = new Modal(requireElement<HTMLDialogElement>(root, '.settings__modal-crop'), () => cropper.reset());

  const setAvatar = (url?: string) => {
    avatar.src = url ?? AVATAR_PLACEHOLDER;
    deleteButton.hidden = !url;
  };

  const setHintError = (text: string | null) => {
    hint.textContent = text ?? hintText;
    hint.classList.toggle('settings__hint_error', !!text);
  };

  const openPicker = (error: string | null) => {
    setAlert(pickerAlert, error);
    picker.open();
  };

  const handleFile = async () => {
    const file = fileInput.files?.[0];
    if (!file || !isActive()) {
      return;
    }
    fileInput.disabled = true;
    const isCurrentFile = () => isActive() && fileInput.files?.[0] === file;
    try {
      const error = await validateAvatar(file);
      if (!isCurrentFile()) {
        return;
      }
      if (error) {
        fileInput.value = '';
        setAlert(pickerAlert, error);
        return;
      }
      await cropper.load(file);
      if (isCurrentFile()) {
        picker.close();
        crop.open();
      }
    } catch {
      if (!isCurrentFile()) {
        return;
      }
      fileInput.value = '';
      setAlert(pickerAlert, AVATAR_OPEN_ERROR);
    } finally {
      fileInput.disabled = false;
    }
  };

  const handleApply = async () => {
    if (!isActive()) {
      return;
    }
    applyButton.disabled = true;
    try {
      const blob = await cropper.toBlob();
      if (!isActive()) {
        return;
      }
      const url = await uploadAvatar(blob, context);
      if (url === undefined || !isActive()) {
        return;
      }
      setAvatar(url);
      setHintError(null);
      crop.close();
      showToast(AVATAR_SAVED_MESSAGE);
    } catch (err) {
      if (!isActive() || (err instanceof ApiError && err.isUnauthorized)) {
        return;
      }
      const isFileError = err instanceof ApiError && !err.isCsrfError && [400, 413, 415].includes(err.status);
      crop.close();
      openPicker(err instanceof ApiError && !isFileError ? err.text : AVATAR_ERROR);
    } finally {
      applyButton.disabled = false;
    }
  };

  const handleDelete = async () => {
    if (!isActive()) {
      return;
    }
    deleteButton.disabled = true;
    setHintError(null);
    try {
      const deleted = await deleteAvatar(context);
      if (!deleted || !isActive()) {
        return;
      }
      setAvatar();
      showToast(AVATAR_DELETED_MESSAGE);
    } catch (err) {
      if (!isActive() || (err instanceof ApiError && err.isUnauthorized)) {
        return;
      }
      setHintError(err instanceof ApiError && (err.isCsrfError || err.status === 0) ? err.text : AVATAR_DELETE_ERROR);
    } finally {
      deleteButton.disabled = false;
    }
  };

  requireElement(root, '[data-avatar-change]').addEventListener('click', () => openPicker(null));
  fileInput.addEventListener('change', handleFile);
  applyButton.addEventListener('click', handleApply);
  deleteButton.addEventListener('click', handleDelete);
  return () => {
    cropper.destroy();
    picker.destroy();
    crop.destroy();
  };
}

/**
 * Подключает форму настроек.
 * @param root
 * @param profile
 * @param navigate
 * @param context
 */
function bindSettings(root: HTMLElement, profile: Profile, navigate: Navigate, context: SessionContext): () => void {
  const form = requireElement<HTMLFormElement>(root, '#settings-form');
  const category = root.querySelector<HTMLElement>('.select');
  const select = category ? new Select(category) : undefined;
  const schema = profile.author ? authorSettingsSchema(profile.author) : userSettingsSchema;
  bindValidation(form, schema, (values) => submitSettings(root, profile, values, navigate, context));
  const disposeAvatar = bindAvatar(root, context);
  return () => { select?.destroy(); disposeAvatar(); };
}

/**
 * Загружает профиль и показывает форму.
 * @param root
 * @param navigate
 */
export function initSettings(root: HTMLElement, navigate: Navigate, _params: RouteParams, setRefreshNotice: SetRefreshNotice): () => void {
  let active = true;
  let request = 0;
  let busy = false;
  let readOnly = false;
  let needsRetry = false;
  let ownerId: string | undefined;
  let baseline: Record<string, string> | undefined;
  let recoveryPending = false;
  let disposeForm: (() => void) | undefined;
  const values = () => Object.fromEntries([...root.querySelectorAll<HTMLInputElement | HTMLTextAreaElement>('#settings-form input, #settings-form textarea')]
    .filter((input) => ['nickname', 'bio', 'category'].includes(input.name)).map((input) => [input.name, input.value]));
  const setReadOnly = (value: boolean) => {
    readOnly = value;
    needsRetry = value;
    setRefreshNotice(value ? { pending: busy } : null, () => { void load(); });
    root.querySelectorAll<HTMLInputElement | HTMLButtonElement | HTMLTextAreaElement>('input, button, textarea')
      .forEach((element) => { element.disabled = value || element.getAttribute('name') === 'username'; });
    root.querySelectorAll<HTMLElement>('[data-settings-offline]').forEach((element) => { element.hidden = !value; });
    const fieldset = root.querySelector<HTMLFieldSetElement>('[data-settings-fields]');
    if (fieldset) {
      fieldset.disabled = value;
    }
    if (value) {
      root.querySelectorAll<HTMLElement>('.select__list').forEach((list) => { list.hidden = true; });
    }
  };
  const load = async () => {
    if (!active || busy) {
      return;
    }
    const id = ++request;
    const version = getSessionVersion();
    const current = () => active && id === request && version === getSessionVersion();
    busy = true;
    if (needsRetry) {
      setRefreshNotice({ pending: true }, () => { void load(); });
    }
    const stopLoading = startLoading(root);
    try {
      let profile: Profile | SavedProfile | undefined;
      let offline = false;
      try {
        profile = await checkSession();
      } catch (error) {
        if (!isBackendUnavailable(error)) {
          throw error;
        }
        offline = true;
        const copy = await readOfflineCopy(ownerId);
        const token = await captureOfflineToken();
        profile = copy && copy.generation === token?.generation ? copy.profile : undefined;
      }
      if (!current()) {
        return;
      }
      if (!profile) {
        disposeForm?.();
        disposeForm = undefined;
        root.innerHTML = settingsTemplate({ message: 'Не удалось открыть настройки', isError: true });
        readOnly = offline;
        needsRetry = true;
      } else {
        const edits = ownerId === profile.user.id && baseline
          ? Object.entries(values()).filter(([name, value]) => value !== baseline?.[name]) : [];
        ownerId = profile.user.id;
        if (offline && edits.length > 0) {
          setReadOnly(true);
          return;
        }
        disposeForm?.();
        disposeForm = undefined;
        root.innerHTML = settingsTemplate({ ...buildSettingsViewModel(profile), offline });
        baseline = values();
        for (const [name, value] of edits) {
          const input = root.querySelector<HTMLInputElement | HTMLTextAreaElement>(`[name="${name}"]`);
          if (input) {
            input.value = value;
          }
        }
        const context = getSessionContext();
        if (!offline && context && context.userId === ownerId) {
          disposeForm = bindSettings(root, profile as Profile, navigate, context);
        }
        setReadOnly(offline);
      }
    } catch (error) {
      if (current() && !(error instanceof ApiError && error.isUnauthorized)) {
        disposeForm?.();
        disposeForm = undefined;
        root.innerHTML = settingsTemplate({ message: LOAD_ERROR, isError: true });
        needsRetry = true;
      }
    } finally {
      stopLoading();
      if (id === request) {
        busy = false;
        setRefreshNotice(needsRetry ? { pending: false } : null, () => { void load(); });
        if (recoveryPending) {
          recoveryPending = false;
          if (active && readOnly) {
            void load();
          }
        }
      }
    }
  };
  const handleOffline = () => {
    setReadOnly(true);
    root.querySelectorAll<HTMLDialogElement>('dialog[open]').forEach((dialog) => { dialog.close(); });
  };
  window.addEventListener('offline', handleOffline);
  const unbindRecovery = bindOfflineRecovery(() => {
    if (busy) {
      recoveryPending = true;
    } else {
      void load();
    }
  }, () => active && readOnly && !root.querySelector('dialog[open]'));
  const unsubscribe = authStore.subscribe(() => {
    if (active && authStore.getState().status === 'unknown') {
      baseline = undefined;
      ownerId = undefined;
      request += 1;
      busy = false;
      disposeForm?.();
      disposeForm = undefined;
      root.innerHTML = renderSettings();
      void load();
    }
  });
  void load();
  return () => {
    active = false;
    setRefreshNotice(null);
    disposeForm?.();
    cancelLoading(root);
    unsubscribe();
    unbindRecovery();
    window.removeEventListener('offline', handleOffline);
  };
}
