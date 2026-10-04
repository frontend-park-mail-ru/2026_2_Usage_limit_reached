import { request } from './request.js';

/**
 * Пользователь в ответе бэкенда.
 * @typedef {Object} User
 * @property {string} email - Адрес электронной почты.
 * @property {string} username - Имя пользователя.
 * @property {string} nickname - Отображаемое имя.
 * @property {string} status - Статус аккаунта, например 'active'.
 */

/**
 * Регистрирует пользователя. При успехе бэкенд сразу ставит куку сессии.
 * @param {Object} data - Данные из формы регистрации.
 * @param {string} data.email - Адрес электронной почты.
 * @param {string} data.username - Имя пользователя.
 * @param {string} data.nickname - Отображаемое имя.
 * @param {string} data.password - Пароль.
 * @returns {Promise<User>} Созданный пользователь.
 * @throws {import('./request.js').ApiError} 400 — неверные данные, 409 — пользователь уже существует.
 */
export const signup = ({ email, username, nickname, password }) =>
  request('/signup', { method: 'POST', data: { email, username, nickname, password } });

/**
 * Входит в аккаунт. При успехе бэкенд ставит куку сессии.
 * Бэкенд сам определяет, почта это или имя пользователя.
 * @param {Object} data - Данные из формы входа.
 * @param {string} data.login - Адрес электронной почты или имя пользователя.
 * @param {string} data.password - Пароль.
 * @returns {Promise<User>} Вошедший пользователь.
 * @throws {import('./request.js').ApiError} 400 — неверные данные, 401 — неверный логин или пароль.
 */
export const login = ({ login, password }) =>
  request('/login', { method: 'POST', data: { login, password } });

/**
 * Выходит из аккаунта: бэкенд удаляет куку сессии.
 * @returns {Promise<void>}
 * @throws {import('./request.js').ApiError} 401 — пользователь и так не вошёл.
 */
export const logout = async () => {
  await request('/logout', { method: 'POST' });
};

/**
 * Возвращает пользователя, которому принадлежит кука сессии.
 * Так фронт узнаёт, вошёл ли пользователь: саму куку JS прочитать не может.
 * @returns {Promise<User>} Текущий пользователь.
 * @throws {import('./request.js').ApiError} 401 — пользователь не вошёл.
 */
export const getMe = () => request('/me');
