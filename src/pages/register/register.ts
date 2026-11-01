import { render } from '../../app/view.ts';
import { requireElement } from '../../utils/helpers/dom.ts';
import { initPasswordToggles } from '../../components/formField/formField.ts';
import { bindValidation, setFormError } from '../../modules/validation/bindForm.ts';
import { registerSchema } from '../../modules/validation/schemas.ts';
import { signup } from '../../modules/auth/auth.actions.ts';
import type { SignupData } from '../../modules/api/auth.types.ts';
import { ApiError } from '../../modules/api/request.ts';
import { FORM_ERRORS, UNKNOWN_ERROR } from './register.constants.ts';

/** Возвращает HTML страницы регистрации. */
export function renderRegister(): string {
  return render('pages/register/register');
}

/**
 * Отправляет форму регистрации.
 * @param form
 * @param data
 */
async function submitRegister(form: HTMLFormElement, data: SignupData): Promise<void> {
  const button = requireElement<HTMLButtonElement>(form, 'button[type="submit"]');
  if (button.disabled) {
    return;
  }
  const submittedValues = new FormData(form);
  button.disabled = true;
  setFormError(form, null);

  try {
    await signup(data);
  } catch (err) {
    if (!form.isConnected) {
      return;
    }
    if (!(err instanceof ApiError)) {
      throw err;
    }

    const kind = err.status === 400 || err.status === 409 ? 'data' : 'server';
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
 * Подключает форму страницы регистрации.
 * @param root
 */
export function initRegister(root: HTMLElement): void {
  const form = requireElement<HTMLFormElement>(root, '#register-form');

  initPasswordToggles(form);
  bindValidation(form, registerSchema, ({ email, username, nickname, password }) =>
    submitRegister(form, { email, username, nickname, password }));
}
