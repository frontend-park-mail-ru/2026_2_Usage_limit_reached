import template from './login.hbs?raw';
import { render } from '../../app/view.js';
import { initPasswordToggles } from '../../components/formField/formField.js';

/**
 * Данные, которые пользователь ввёл в форму входа.
 * @typedef {Object} LoginData
 * @property {string} login - Адрес электронной почты или имя пользователя.
 * @property {string} password - Пароль.
 */

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

    /** @type {LoginData} */
    const data = Object.fromEntries(new FormData(form));

    console.log('login', data);
  });
}
