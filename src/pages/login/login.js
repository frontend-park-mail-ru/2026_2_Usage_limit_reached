import { render } from '../../app/view.js';
import { bindLinks } from '../../app/linkClick.js';
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
  return render('pages/login/login');
}

/**
 * Отправляет данные входа на сервер.
 * При успехе переходит в профиль, при ошибке показывает её в форме.
 * @param {HTMLFormElement} form - Форма входа.
 * @param {LoginData} data - Проверенные данные формы.
 * @param {(path: string) => void} navigate - Функция перехода из роутера.
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
 * Подключает обработчики формы входа и ссылок после рендера страницы.
 * @param {HTMLElement} root - Контейнер, в который отрисована страница.
 * @param {(path: string) => void} navigate - Функция перехода из роутера.
 */
export function initLogin(root, navigate) {
  const form = root.querySelector('#login-form');

  initPasswordToggles(form);
  bindValidation(form, loginSchema, (data) => submitLogin(form, data, navigate));
  bindLinks(root, navigate);
}
