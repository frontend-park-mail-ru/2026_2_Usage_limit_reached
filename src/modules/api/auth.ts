import { request } from './request.js';

/**
 * Данные для регистрации
 */
export type SignupData = {
  email: string;
  username: string;
  nickname: string;
  password: string;
};

/**
 * Данные для входа
 */
export type LoginData = {
  login: string;
  password: string;
};

/**
 * Пользователь в ответе на регистрацию и вход
 */
export type AuthUser = {
  email: string;
  username: string;
  nickname: string;
};

/**
 * Регистрирует пользователя
 * @throws {ApiError}
 */
export const signup = ({ email, username, nickname, password }: SignupData) =>
  request<AuthUser>('/signup', { method: 'POST', data: { email, username, nickname, password } });

/**
 * Входит в аккаунт
 * @throws {ApiError}
 */
export const login = ({ login, password }: LoginData) =>
  request<AuthUser>('/login', { method: 'POST', data: { login, password } });

/**
 * Завершает сессию пользователя.
 */
export const logout = () => request<unknown>('/logout', { method: 'POST' });
