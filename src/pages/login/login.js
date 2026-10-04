import { render } from '../../app/view.js';
import { initPasswordToggles } from '../../components/formField/formField.js';

/**
 * Данные, которые пользователь ввёл в форму входа.
 * @typedef {Object} LoginData
 * @property {string} login - Адрес электронной почты или имя пользователя.
 * @property {string} password - Пароль.
 */

const template = `
  <section class="page page--auth">
    <form class="auth-form" id="login-form">
      {{> logo}}
      <div class="auth-form__header">
        <h1 class="auth-form__title">С возвращением!</h1>
        <p class="auth-form__subtitle">Войдите в аккаунт, чтобы продолжить</p>
      </div>
      {{> formField id="login-user" name="login" type="text" label="Адрес электронной почты или имя пользователя" autocomplete="username" placeholder="email@example.com"}}
      {{> formField id="login-password" name="password" type="password" label="Пароль" autocomplete="current-password" placeholder="••••••••" passwordToggle=true}}
      <button class="button button--primary" type="submit">Войти</button>
      <a class="button button--secondary" href="/register" data-link>Создать новый аккаунт</a>
    </form>
  </section>
`;

/**
 * Возвращает HTML страницы входа.
 * @returns {string} HTML страницы.
 */
export function renderLogin() {
  return render(template);
}

/**
 * Подключает обработчики формы входа после того, как страница отрисована.
 * @param {HTMLElement} root - Контейнер, в который отрисована страница.
 */
export function initLogin(root) {
  const form = root.querySelector('#login-form');

  initPasswordToggles(form);

  form.addEventListener('submit', (e) => {
    e.preventDefault();

    const data = Object.fromEntries(new FormData(form));

    console.log('login', data);
  });
}
