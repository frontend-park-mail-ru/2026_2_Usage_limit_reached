import { render } from '../../app/view.js';
import { bindLinks } from '../../utils/helpers/bindLinks.js';
import { initPasswordToggles } from '../../components/formField/formField.js';
import { bindValidation, setFormError } from '../../modules/validation/bindForm.js';
import { loginSchema } from '../../modules/validation/schemas.js';
import { login } from '../../modules/api/auth.js';
import { ApiError } from '../../modules/api/request.js';

/**
 * Данные формы входа.
 * @typedef {Object} LoginData
 * @property {string} login
 * @property {string} password
 */

/**
 * Сообщения для ошибок входа. Код 0 означает сетевую ошибку.
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
  return render('pages/login/login');
}

/**
 * Отправляет форму входа.
 * @param {HTMLFormElement} form - Форма входа.
 * @param {LoginData} data - Проверенные данные формы.
 * @param {(path: string) => void} navigate - Функция перехода.
 * @returns {Promise<void>}
 */
async function submitLogin(form, data, navigate) {
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
 * Подключает форму и ссылки страницы входа.
 * @param {HTMLElement} root - Контейнер страницы.
 * @param {(path: string) => void} navigate - Функция перехода.
 * @returns {void}
 */
export function initLogin(root, navigate) {
  const form = root.querySelector('#login-form');

  initPasswordToggles(form);
  bindValidation(form, loginSchema, (data) => submitLogin(form, data, navigate));
  bindLinks(root, navigate);
}
