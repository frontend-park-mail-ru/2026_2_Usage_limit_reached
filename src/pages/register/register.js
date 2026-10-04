import { render } from '../../app/view.js';
import { navigate } from '../../app/router.js';
import { initPasswordToggles } from '../../components/formField/formField.js';
import { bindValidation, showErrors, setFormError } from '../../modules/validation/bindForm.js';
import { registerSchema } from '../../modules/validation/schemas.js';
import { signup } from '../../modules/api/auth.js';
import { ApiError } from '../../modules/api/request.js';

/**
 * Данные, которые пользователь ввёл в форму регистрации.
 * @typedef {Object} RegisterData
 * @property {string} email
 * @property {string} username
 * @property {string} nickname
 * @property {string} password
 * @property {string} passwordRepeat
 */

const template = `
  <section class="page page--auth">
    <form class="auth-form" id="register-form" novalidate>
      {{> logo}}
      <div class="auth-form__header">
        <h1 class="auth-form__title">Добро пожаловать!</h1>
        <p class="auth-form__subtitle">Создайте аккаунт, чтобы начать</p>
      </div>
      {{> formField id="register-email" name="email" type="email" label="Адрес электронной почты" autocomplete="email" placeholder="email@example.com"}}
      {{> formField id="register-username" name="username" type="text" label="Имя пользователя" autocomplete="username" placeholder="ivan_petrov"}}
      {{> formField id="register-nickname" name="nickname" type="text" label="Отображаемое имя" autocomplete="name" placeholder="Иван Петров"}}
      {{> formField id="register-password" name="password" type="password" label="Пароль" autocomplete="new-password" placeholder="••••••••" passwordToggle=true}}
      {{> formField id="register-password-repeat" name="passwordRepeat" type="password" label="Повторите пароль" autocomplete="new-password" placeholder="••••••••" passwordToggle=true}}
      <p class="form-field__error" data-form-error aria-live="polite"></p>
      <button class="button button--primary" type="submit">Зарегистрироваться</button>
      <a class="button button--secondary" href="/login" data-link>У меня уже есть аккаунт</a>
    </form>
  </section>
`;

/**
 * Ошибки сервера.
 * @type {Object<number, Object<string, string>>}
 */
const FIELD_ERRORS = {
  400: { email: 'Проверьте адрес электронной почты' },
  409: { email: 'Эта почта или имя пользователя уже заняты' },
};

/**
 * Общие ошибки формы.
 * @type {Object<number, string>}
 */
const FORM_ERRORS = {
  0: 'Сервер недоступен. Проверьте интернет и попробуйте ещё раз',
};

const UNKNOWN_ERROR = 'Что-то пошло не так. Попробуйте позже';

/**
 * Возвращает HTML страницы регистрации.
 * @returns {string}
 */
export function renderRegister() {
  return render(template);
}

/**
 * Отправляет данные регистрации на сервер.
 * @param {HTMLFormElement} form
 * @param {RegisterData} data
 * @returns {Promise<void>}
 */
async function submitRegister(form, data) {
  const button = form.querySelector('button[type="submit"]');
  button.disabled = true;
  setFormError(form, null);

  try {
    await signup(data);
    navigate('/profile');
  } catch (err) {
    if (!(err instanceof ApiError)) throw err;

    const fieldErrors = FIELD_ERRORS[err.status];
    if (fieldErrors) {
      showErrors(form, fieldErrors);
    } else {
      setFormError(form, FORM_ERRORS[err.status] ?? UNKNOWN_ERROR);
    }
  } finally {
    button.disabled = false;
  }
}

/**
 * Подключает обработчики формы регистрации.
 * @param {HTMLElement} root
 */
export function initRegister(root) {
  const form = root.querySelector('#register-form');

  initPasswordToggles(form);
  bindValidation(form, registerSchema, (data) => submitRegister(form, data));
}
