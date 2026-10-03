import { render } from '../../app/view.js';
import { initPasswordToggles } from '../../components/formField/formField.js';
import { bindValidation } from '../../modules/validation/bindForm.js';
import { registerSchema } from '../../modules/validation/schemas.js';

/**
 * Данные, которые пользователь ввёл в форму регистрации.
 * @typedef {Object} RegisterData
 * @property {string} email - Адрес электронной почты.
 * @property {string} username - Имя пользователя.
 * @property {string} nickname - Отображаемое имя (на бэке поле nickname).
 * @property {string} password - Пароль.
 * @property {string} passwordRepeat - Повтор пароля.
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
      <button class="button button--primary" type="submit">Зарегистрироваться</button>
      <a class="button button--secondary" href="/login" data-link>У меня уже есть аккаунт</a>
    </form>
  </section>
`;

/**
 * Возвращает HTML страницы регистрации.
 * @returns {string} HTML страницы.
 */
export function renderRegister() {
  return render(template);
}

/**
 * Отправляет данные регистрации. Пока выводит их в консоль, запрос на сервер будет в PTN-13.
 * @param {RegisterData} data - Проверенные данные формы.
 */
function submitRegister(data) {
  console.log('register', data);
}

/**
 * Подключает обработчики формы регистрации после того, как страница отрисована.
 * @param {HTMLElement} root - Контейнер, в который отрисована страница.
 */
export function initRegister(root) {
  const form = root.querySelector('#register-form');

  initPasswordToggles(form);
  bindValidation(form, registerSchema, submitRegister);
}
