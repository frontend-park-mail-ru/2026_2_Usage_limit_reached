import { request } from './request.js';

/**
 * Регистрирует пользователя
 * @param {Object} data
 * @param {string} data.email
 * @param {string} data.username
 * @param {string} data.nickname
 * @param {string} data.password
 * @returns {Promise<{ email: string, username: string, nickname: string }>}
 * @throws {ApiError}
 */
export const signup = ({ email, username, nickname, password }) =>
  request('/signup', { method: 'POST', data: { email, username, nickname, password } });

/**
 * Входит в аккаунт
 * @param {Object} data
 * @param {string} data.login
 * @param {string} data.password
 * @returns {Promise<{ email: string, username: string, nickname: string }>}
 * @throws {ApiError}
 */
export const login = ({ login, password }) =>
  request('/login', { method: 'POST', data: { login, password } });

/**
 * Завершает сессию пользователя.
 * @returns {Promise<Object>} Ответ сервера.
 */
export const logout = () => request('/logout', { method: 'POST' });
