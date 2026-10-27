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

const FORM_ERRORS: Record<number, string> = {
  0: 'Сервер недоступен. Проверьте интернет и попробуйте ещё раз',
  400: 'Проверьте введённые данные',
  409: 'Эта почта или имя пользователя уже заняты',
};

const UNKNOWN_ERROR = 'Что-то пошло не так. Попробуйте позже';

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
  bindValidation(form, registerSchema, (data) => submitRegister(form, data as SignupData, navigate));
  bindLinks(root, navigate);
}
