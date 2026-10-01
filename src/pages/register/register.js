import template from './register.hbs?raw';
import { render } from '../../app/view.js';
import { initPasswordToggles } from '../../components/formField/formField.js';

/**
 * Данные, которые пользователь ввёл в форму регистрации.
 * @typedef {Object} RegisterData
 * @property {string} email - Адрес электронной почты.
 * @property {string} username - Имя пользователя.
 * @property {string} nickname - Отображаемое имя (на бэке поле nickname).
 * @property {string} password - Пароль.
 * @property {string} passwordRepeat - Повтор пароля.
 */

/**
 * Возвращает HTML страницы регистрации.
 * @returns {string} HTML страницы.
 */
export function renderRegister() {
  return render(template);
}

/**
 * Подключает обработчики формы регистрации после того, как страница отрисована.
 * @param {HTMLElement} root - Контейнер, в который отрисована страница.
 */
export function initRegister(root) {
  const form = root.querySelector('#register-form');

  initPasswordToggles(form);

  form.addEventListener('submit', (e) => {
    e.preventDefault();

    /** @type {RegisterData} */
    const data = Object.fromEntries(new FormData(form));

    // Отправка на сервер будет в задаче про API, проверка полей — в задаче про валидацию.
    console.log('register', data);
  });
}
