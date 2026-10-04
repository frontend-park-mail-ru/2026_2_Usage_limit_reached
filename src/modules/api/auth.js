import { request } from './request.js';

/**
 * Регистрирует пользователя. При успехе бэкенд сразу ставит куку сессии.
 * @param {Object} data - Данные из формы регистрации.
 * @param {string} data.email - Адрес электронной почты.
 * @param {string} data.username - Имя пользователя.
 * @param {string} data.nickname - Отображаемое имя.
 * @param {string} data.password - Пароль.
 * @returns {Promise<{ email: string, username: string, nickname: string }>} Созданный пользователь.
 * @throws {ApiError} 400 — неверные данные, 409 — пользователь уже существует.
 */
export const signup = ({ email, username, nickname, password }) =>
  request('/signup', { method: 'POST', data: { email, username, nickname, password } });

/**
 * Входит в аккаунт. При успехе бэкенд ставит куку сессии.
 * Бэкенд сам определяет, почта это или имя пользователя.
 * @param {Object} data - Данные из формы входа.
 * @param {string} data.login - Адрес электронной почты или имя пользователя.
 * @param {string} data.password - Пароль.
 * @returns {Promise<{ email: string, username: string, nickname: string }>} Вошедший пользователь.
 * @throws {ApiError} 400 — неверные данные, 401 — неверный логин или пароль.
 */
export const login = ({ login, password }) =>
  request('/login', { method: 'POST', data: { login, password } });
