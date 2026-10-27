import { render } from '../../app/view.js';
import { bindLinks } from '../../utils/helpers/bindLinks.js';
import { requireElement } from '../../utils/helpers/dom.js';
import { initPasswordToggles } from '../../components/formField/formField.js';
import { bindValidation, setFormError } from '../../modules/validation/bindForm.js';
import { loginSchema } from '../../modules/validation/schemas.js';
import { login } from '../../modules/api/auth.js';
import type { LoginData } from '../../modules/api/auth.types.js';
import { ApiError } from '../../modules/api/request.js';
import { ROUTES } from '../../app/paths.js';
import type { Navigate } from '../../app/paths.js';
import { FORM_ERRORS, UNKNOWN_ERROR } from './login.constants.js';

export function renderLogin(): string {
  return render('pages/login/login');
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
