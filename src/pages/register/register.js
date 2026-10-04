import { render } from '../../app/view.js';
import { bindLinks } from '../../app/linkClick.js';
import { initPasswordToggles } from '../../components/formField/formField.js';
import { bindValidation, showErrors, setFormError } from '../../modules/validation/bindForm.js';
import { registerSchema } from '../../modules/validation/schemas.js';
import { signup } from '../../modules/api/auth.js';
import { ApiError } from '../../modules/api/request.js';

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
 * Ошибки сервера, которые показываются под полями: код ответа → поле → текст.
 * @type {Object<number, Object<string, string>>}
 */
const FIELD_ERRORS = {
  400: { email: 'Проверьте адрес электронной почты' },
  409: { email: 'Эта почта или имя пользователя уже заняты' },
};

/**
 * Общие ошибки формы: код ответа → текст. 0 — сервер не ответил.
 * @type {Object<number, string>}
 */
const FORM_ERRORS = {
  0: 'Сервер недоступен. Проверьте интернет и попробуйте ещё раз',
};

/** Текст общей ошибки на любой другой ответ сервера. */
const UNKNOWN_ERROR = 'Что-то пошло не так. Попробуйте позже';

/**
 * Возвращает HTML страницы регистрации.
 * @returns {string} HTML страницы.
 */
export function renderRegister() {
  return render('pages/register/register');
}

/**
 * Отправляет данные регистрации на сервер.
 * При успехе переходит в профиль, при ошибке показывает её в форме.
 * @param {HTMLFormElement} form - Форма регистрации.
 * @param {RegisterData} data - Проверенные данные формы.
 * @param {(path: string) => void} navigate - Функция перехода из роутера.
 * @returns {Promise<void>}
 */
async function submitRegister(form, data, navigate) {
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
 * Подключает обработчики формы регистрации и ссылок после рендера страницы.
 * @param {HTMLElement} root - Контейнер, в который отрисована страница.
 * @param {(path: string) => void} navigate - Функция перехода из роутера.
 */
export function initRegister(root, navigate) {
  const form = root.querySelector('#register-form');

  initPasswordToggles(form);
  bindValidation(form, registerSchema, (data) => submitRegister(form, data, navigate));
  bindLinks(root, navigate);
}
