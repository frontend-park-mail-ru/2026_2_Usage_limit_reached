import { render } from '../../app/view.js';
import { bindLinks } from '../../utils/helpers/bindLinks.js';
import { requireElement } from '../../utils/helpers/dom.js';
import { initPasswordToggles } from '../../components/formField/formField.js';
import { bindValidation, setFormError } from '../../modules/validation/bindForm.js';
import { loginSchema } from '../../modules/validation/schemas.js';
import { login } from '../../modules/api/auth.js';
import type { LoginData } from '../../modules/api/auth.js';
import { ApiError } from '../../modules/api/request.js';

const FORM_ERRORS: Record<number, string> = {
  0: 'Сервер недоступен. Проверьте интернет и попробуйте ещё раз',
  400: 'Проверьте введённые данные',
  401: 'Неверные данные для входа!',
};

const UNKNOWN_ERROR = 'Что-то пошло не так. Попробуйте позже';

export function renderLogin(): string {
  return render('pages/login/login');
}

async function submitLogin(form: HTMLFormElement, data: LoginData, navigate: (path: string) => void): Promise<void> {
  const button = requireElement<HTMLButtonElement>(form, 'button[type="submit"]');
  button.disabled = true;
  setFormError(form, null);

  try {
    await login(data);
    navigate('/profile');
  } catch (err) {
    if (!(err instanceof ApiError)) throw err;

    setFormError(form, FORM_ERRORS[err.status] ?? UNKNOWN_ERROR);
  } finally {
    button.disabled = false;
  }
}

export function initLogin(root: HTMLElement, navigate: (path: string) => void): void {
  const form = requireElement<HTMLFormElement>(root, '#login-form');

  initPasswordToggles(form);
  bindValidation(form, loginSchema, (data) => submitLogin(form, data as LoginData, navigate));
  bindLinks(root, navigate);
}
