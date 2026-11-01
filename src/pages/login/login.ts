import { render } from '../../app/view.ts';
import { requireElement } from '../../utils/helpers/dom.ts';
import { initPasswordToggles } from '../../components/formField/formField.ts';
import { bindValidation, setFormError } from '../../modules/validation/bindForm.ts';
import { loginSchema } from '../../modules/validation/schemas.ts';
import { login } from '../../modules/auth/auth.actions.ts';
import type { LoginData } from '../../modules/api/auth.types.ts';
import { ApiError } from '../../modules/api/request.ts';
import { FORM_ERRORS, UNKNOWN_ERROR } from './login.constants.ts';

/** Возвращает HTML страницы входа. */
export function renderLogin(): string {
  return render('pages/login/login');
}

/**
 * Отправляет форму входа.
 * @param form
 * @param data
 */
async function submitLogin(form: HTMLFormElement, data: LoginData): Promise<void> {
  const button = requireElement<HTMLButtonElement>(form, 'button[type="submit"]');
  if (button.disabled) {
    return;
  }
  const submittedValues = new FormData(form);
  button.disabled = true;
  setFormError(form, null);

  try {
    await login(data);
  } catch (err) {
    if (!form.isConnected) {
      return;
    }
    if (!(err instanceof ApiError)) {
      throw err;
    }

    const kind = err.status === 400 || err.status === 401 ? 'data' : 'server';
    const currentValues = new FormData(form);
    const valuesChanged = [...submittedValues].some(
      ([name, value]) => currentValues.get(name) !== value
    );

    if (kind === 'data' && valuesChanged) {
      return;
    }
    setFormError(form, FORM_ERRORS[err.status] ?? UNKNOWN_ERROR, kind);
  } finally {
    if (form.isConnected) {
      button.disabled = false;
    }
  }
}

/**
 * Подключает форму страницы входа.
 * @param root
 */
export function initLogin(root: HTMLElement): void {
  const form = requireElement<HTMLFormElement>(root, '#login-form');

  initPasswordToggles(form);
  bindValidation(form, loginSchema, ({ login, password }) => submitLogin(form, { login, password }));
}
