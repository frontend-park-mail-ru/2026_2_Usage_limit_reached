import loginTemplate from './login.hbs';
import { bindLinks } from '../../utils/helpers/bindLinks.ts';
import { requireElement } from '../../utils/helpers/dom.ts';
import { initPasswordToggles } from '../../components/formField/formField.ts';
import { bindValidation, setFormError } from '../../modules/validation/bindForm.ts';
import { loginSchema } from '../../modules/validation/schemas.ts';
import { login } from '../../modules/api/auth.ts';
import type { LoginData } from '../../modules/api/auth.types.ts';
import { ApiError } from '../../modules/api/request.ts';
import { ROUTES } from '../../app/paths.ts';
import type { Navigate } from '../../app/paths.ts';
import { FORM_ERRORS, UNKNOWN_ERROR } from './login.constants.ts';

/** Возвращает HTML страницы входа. */
export function renderLogin(): string {
  return loginTemplate();
}

/**
 * Отправляет форму входа.
 * @param form
 * @param data
 * @param navigate
 */
async function submitLogin(form: HTMLFormElement, data: LoginData, navigate: Navigate): Promise<void> {
  const button = requireElement<HTMLButtonElement>(form, 'button[type="submit"]');
  if (button.disabled) {
    return;
  }
  const submittedValues = new FormData(form);
  button.disabled = true;
  setFormError(form, null);

  try {
    await login(data);
    if (!form.isConnected) {
      return;
    }
    navigate(ROUTES.profile);
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
 * Подключает форму и ссылки страницы входа.
 * @param root
 * @param navigate
 */
export function initLogin(root: HTMLElement, navigate: Navigate): void {
  const form = requireElement<HTMLFormElement>(root, '#login-form');

  initPasswordToggles(form);
  bindValidation(form, loginSchema, ({ login, password }) => submitLogin(form, { login, password }, navigate));
  bindLinks(root, navigate);
}
