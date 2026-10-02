import template from './login.hbs?raw';
import { render } from '../../app/view.js';
import { initPasswordToggles } from '../../components/formField/formField.js';
import { bindValidation } from '../../modules/validation/bindForm.js';
import { loginSchema } from '../../modules/validation/schemas.js';

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
 * Отправляет данные входа. Пока выводит их в консоль, запрос на сервер будет в PTN-13.
 * @param {LoginData} data - Проверенные данные формы.
 */
function submitLogin(data) {
  console.log('login', data);
}

/**
 * Подключает обработчики формы входа после того, как страница отрисована.
 * @param {HTMLElement} root - Контейнер, в который отрисована страница.
 */
export function initLogin(root) {
  const form = root.querySelector('#login-form');

  initPasswordToggles(form);
  bindValidation(form, loginSchema, submitLogin);
}
