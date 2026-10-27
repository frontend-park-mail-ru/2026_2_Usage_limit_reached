import { render } from '../../app/view.js';
import { bindLinks } from '../../utils/helpers/bindLinks.js';
import { requireElement } from '../../utils/helpers/dom.js';
import { initPasswordToggles } from '../../components/formField/formField.js';
import { bindValidation, setFormError } from '../../modules/validation/bindForm.js';
import { registerSchema } from '../../modules/validation/schemas.js';
import { signup } from '../../modules/api/auth.js';
import type { SignupData } from '../../modules/api/auth.types.js';
import { ApiError } from '../../modules/api/request.js';
import { ROUTES } from '../../app/paths.js';
import type { Navigate } from '../../app/paths.js';
import { FORM_ERRORS, UNKNOWN_ERROR } from './register.constants.js';

export function renderRegister(): string {
  return render('pages/register/register');
}

async function submitRegister(form: HTMLFormElement, data: SignupData, navigate: Navigate): Promise<void> {
  const button = requireElement<HTMLButtonElement>(form, 'button[type="submit"]');
  button.disabled = true;
  setFormError(form, null);

  try {
    await signup(data);
    navigate(ROUTES.profile);
  } catch (err) {
    if (!(err instanceof ApiError)) throw err;

    setFormError(form, FORM_ERRORS[err.status] ?? UNKNOWN_ERROR);
  } finally {
    button.disabled = false;
  }
}

export function initRegister(root: HTMLElement, navigate: Navigate): void {
  const form = requireElement<HTMLFormElement>(root, '#register-form');

  initPasswordToggles(form);
  bindValidation(form, registerSchema, ({ email, username, nickname, password }) =>
    submitRegister(form, { email, username, nickname, password }, navigate));
  bindLinks(root, navigate);
}
