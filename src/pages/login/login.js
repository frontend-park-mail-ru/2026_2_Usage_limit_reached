import { render } from '../../app/view.js';
import { navigate } from '../../app/router.js';
import { initPasswordToggles } from '../../components/formField/formField.js';
import { bindValidation, setFormError } from '../../modules/validation/bindForm.js';
import { loginSchema } from '../../modules/validation/schemas.js';
import { login } from '../../modules/api/auth.js';
import { ApiError } from '../../modules/api/request.js';

/**
 * Данные, которые пользователь ввёл в форму входа.
 * @typedef {Object} LoginData
 * @property {string} login
 * @property {string} password
 */

const template = `
  <section class="page page--auth">
    <form class="auth-form" id="login-form" novalidate>
      {{> logo}}
      <div class="auth-form__header">
        <h1 class="auth-form__title">С возвращением!</h1>
        <p class="auth-form__subtitle">Войдите в аккаунт, чтобы продолжить</p>
      </div>
      {{> formField id="login-user" name="login" type="text" label="Адрес электронной почты или имя пользователя" autocomplete="username" placeholder="email@example.com"}}
      {{> formField id="login-password" name="password" type="password" label="Пароль" autocomplete="current-password" placeholder="••••••••" passwordToggle=true}}
      <p class="form-field__error" data-form-error aria-live="polite"></p>
      <button class="button button--primary" type="submit">Войти</button>
      <a class="button button--secondary" href="/register" data-link>Создать новый аккаунт</a>
    </form>
  </section>
`;

/**
 * Общие ошибки формы.
 * @type {Object<number, string>}
 */
const FORM_ERRORS = {
  0: 'Сервер недоступен. Проверьте интернет и попробуйте ещё раз',
  401: 'Неверные данные для входа!',
};

const UNKNOWN_ERROR = 'Что-то пошло не так. Попробуйте позже';

/**
 * Возвращает HTML страницы входа.
 * @returns {string}
 */
export function renderLogin() {
  return render(template);
}

/**
 * Отправляет данные входа на сервер.
 * @param {HTMLFormElement} form
 * @param {LoginData} data
 * @returns {Promise<void>}
 */
async function submitLogin(form, data) {
  const button = form.querySelector('button[type="submit"]');
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

/**
 * Подключает обработчики формы входа.
 * @param {HTMLElement} root
 */
export function initLogin(root) {
  const form = root.querySelector('#login-form');

  initPasswordToggles(form);
  bindValidation(form, loginSchema, (data) => submitLogin(form, data));
}
