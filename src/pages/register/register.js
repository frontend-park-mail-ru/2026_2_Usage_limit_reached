import template from './register.hbs?raw';
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
