import { request } from './request.ts';
import type { AuthUser, LoginData, SignupData } from './auth.types.ts';

/**
 * Регистрирует пользователя.
 * @param data
 * @throws {ApiError}
 */
export const signup = ({ email, username, nickname, password }: SignupData) =>
  request<AuthUser>('/signup', { method: 'POST', data: { email, username, nickname, password } });

/**
 * Входит в аккаунт.
 * @param data
 * @throws {ApiError}
 */
export const login = ({ login, password }: LoginData) =>
  request<AuthUser>('/login', { method: 'POST', data: { login, password } });

/**
 * Завершает сессию пользователя. Успешный ответ не содержит тела.
 * @throws {ApiError}
 */
export const logout = () => request<void>('/logout', { method: 'POST', responseType: 'empty' });
