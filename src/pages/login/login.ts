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

export function renderLogin(): string {
  return loginTemplate();
}

/**
 * @param form
 * @param data
 * @param navigate
 */
async function submitLogin(form: HTMLFormElement, data: LoginData, navigate: Navigate): Promise<void> {
  const button = requireElement<HTMLButtonElement>(form, 'button[type="submit"]');
  button.disabled = true;
  setFormError(form, null);

  try {
    await login(data);
    navigate(ROUTES.profile);
  } catch (err) {
    if (!(err instanceof ApiError)) {
      throw err;
    }

    setFormError(form, FORM_ERRORS[err.status] ?? UNKNOWN_ERROR);
  } finally {
    button.disabled = false;
  }
}

/**
 * @param root
 * @param navigate
 */
export function initLogin(root: HTMLElement, navigate: Navigate): void {
  const form = requireElement<HTMLFormElement>(root, '#login-form');

  initPasswordToggles(form);
  bindValidation(form, loginSchema, ({ login, password }) => submitLogin(form, { login, password }, navigate));
  bindLinks(root, navigate);
}
