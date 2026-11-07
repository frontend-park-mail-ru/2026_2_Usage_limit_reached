import settingsTemplate from './settings.hbs';
import { requireElement } from '../../utils/helpers/dom.ts';
import { checkSession } from '../../modules/auth/auth.actions.ts';
import { saveProfile, uploadAvatar, deleteAvatar } from '../../modules/profile/profile.actions.ts';
import { AVATAR_PLACEHOLDER } from '../../modules/profile/profile.constants.ts';
import type { Profile, ProfileUpdate } from '../../modules/api/profile.types.ts';
import { ApiError } from '../../modules/api/request.ts';
import { bindValidation, setFieldError } from '../../modules/validation/bindForm.ts';
import { authorSettingsSchema, userSettingsSchema } from '../../modules/validation/schemas.ts';
import type { FormValues } from '../../modules/validation/validation.types.ts';
import { validateAvatar } from '../../modules/validation/avatar.ts';
import { AVATAR_ERROR } from '../../modules/validation/avatar.constants.ts';
import { Select } from '../../components/select/select.ts';
import { Modal } from '../../components/modal/modal.ts';
import { AvatarCropper } from '../../components/avatarCropper/avatarCropper.ts';
import { showToast } from '../../components/toast/toast.ts';
import { setAlert } from '../../components/alert/alert.ts';
import { ROUTES } from '../../app/paths.ts';
import type { Navigate } from '../../app/paths.ts';
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
  USERNAME_TAKEN,
} from './settings.constants.ts';

/** Возвращает каркас с текстом загрузки. */
export function renderSettings(): string {
  return settingsTemplate({ message: LOADING_MESSAGE });
}

/**
 * Данные профиля для шаблона.
 * @param profile
 */
function buildSettingsViewModel(profile: Profile) {
  const category = profile.author?.category ?? '';
  return {
    nickname: profile.user.nickname,
    username: profile.user.username,
    avatarUrl: profile.user.avatar_url ?? AVATAR_PLACEHOLDER,
    hasAvatar: !!profile.user.avatar_url,
    isAuthor: !!profile.author,
    category,
    bio: profile.author?.bio ?? '',
    categories: PROFILE_CATEGORIES.map((value) => ({ value, selected: value === category })),
  };
}

/**
 * Тело запроса из формы.
 * @param profile
 * @param values
 */
function buildProfileUpdate(profile: Profile, values: FormValues): ProfileUpdate {
  const data: ProfileUpdate = {
    user: { username: values.username, nickname: values.nickname, email: profile.user.email },
  };
  if (profile.author) {
    data.author = { ...profile.author, category: values.category, bio: values.bio };
  }
  return data;
}

/**
 * Сохраняет профиль.
 * @param root
 * @param profile
 * @param values
 * @param navigate
 */
async function submitSettings(root: HTMLElement, profile: Profile, values: FormValues, navigate: Navigate): Promise<void> {
  const form = requireElement<HTMLFormElement>(root, '#settings-form');
  const button = requireElement<HTMLButtonElement>(form, 'button[type="submit"]');
  const alert = requireElement<HTMLElement>(root, '.settings__save-error');
  if (button.disabled) {
    return;
  }
  button.disabled = true;
  setAlert(alert, null);

  try {
    await saveProfile(buildProfileUpdate(profile, values));
    showToast(SAVED_MESSAGE);
    if (form.isConnected) {
      navigate(ROUTES.profile);
    }
  } catch (err) {
    if (!form.isConnected) {
      return;
    }
    if (!(err instanceof ApiError)) {
      throw err;
    }
    if (err.status === 401) {
      return;
    }
    if (err.status === 409) {
      setFieldError(form, 'username', USERNAME_TAKEN);
      form.querySelector<HTMLElement>('[name="username"]')?.focus();
      return;
    }
    setAlert(alert, err.status === 0 ? SAVE_NETWORK_ERROR : err.text);
  } finally {
    if (form.isConnected) {
      button.disabled = false;
    }
  }
}

/**
 * Подключает смену и удаление фото.
 * @param root
 */
function bindAvatar(root: HTMLElement): void {
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
    if (!file) {
      return;
    }
    const error = validateAvatar(file);
    if (error) {
      fileInput.value = '';
      setAlert(pickerAlert, error);
      return;
    }
    try {
      await cropper.load(file);
    } catch {
      fileInput.value = '';
      setAlert(pickerAlert, AVATAR_OPEN_ERROR);
      return;
    }
    picker.close();
    crop.open();
  };

  const handleApply = async () => {
    applyButton.disabled = true;
    try {
      const url = await uploadAvatar(await cropper.toBlob());
      if (!root.isConnected) {
        return;
      }
      setAvatar(url);
      setHintError(null);
      crop.close();
      showToast(AVATAR_SAVED_MESSAGE);
    } catch (err) {
      if (!root.isConnected || (err instanceof ApiError && err.status === 401)) {
        return;
      }
      const isFileError = err instanceof ApiError && [400, 413, 415].includes(err.status);
      crop.close();
      openPicker(err instanceof ApiError && !isFileError ? err.text : AVATAR_ERROR);
    } finally {
      applyButton.disabled = false;
    }
  };

  const handleDelete = async () => {
    deleteButton.disabled = true;
    setHintError(null);
    try {
      await deleteAvatar();
      if (!root.isConnected) {
        return;
      }
      setAvatar();
      showToast(AVATAR_DELETED_MESSAGE);
    } catch (err) {
      if (!root.isConnected || (err instanceof ApiError && err.status === 401)) {
        return;
      }
      setHintError(err instanceof ApiError && err.status === 0 ? err.text : AVATAR_DELETE_ERROR);
    } finally {
      deleteButton.disabled = false;
    }
  };

  requireElement(root, '[data-avatar-change]').addEventListener('click', () => openPicker(null));
  fileInput.addEventListener('change', handleFile);
  applyButton.addEventListener('click', handleApply);
  deleteButton.addEventListener('click', handleDelete);
}

/**
 * Подключает форму настроек.
 * @param root
 * @param profile
 * @param navigate
 */
function bindSettings(root: HTMLElement, profile: Profile, navigate: Navigate): void {
  const form = requireElement<HTMLFormElement>(root, '#settings-form');
  const category = root.querySelector<HTMLElement>('.select');
  if (category) {
    new Select(category);
  }
  const schema = profile.author ? authorSettingsSchema : userSettingsSchema;
  bindValidation(form, schema, (values) => submitSettings(root, profile, values, navigate));
  bindAvatar(root);
}

/**
 * Загружает профиль и показывает форму.
 * @param root
 * @param navigate
 */
export async function initSettings(root: HTMLElement, navigate: Navigate): Promise<void> {
  const loadingPage = root.firstElementChild;
  let profile: Profile | undefined;
  try {
    profile = await checkSession();
  } catch (err) {
    if (root.firstElementChild !== loadingPage || (err instanceof ApiError && err.status === 401)) {
      return;
    }
    const message = err instanceof ApiError && err.status === 0 ? err.text : LOAD_ERROR;
    root.innerHTML = settingsTemplate({ message, isError: true });
    return;
  }
  if (!profile || root.firstElementChild !== loadingPage) {
    return;
  }
  root.innerHTML = settingsTemplate(buildSettingsViewModel(profile));
  bindSettings(root, profile, navigate);
}
