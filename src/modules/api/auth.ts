import { request } from './request.ts';
import type { AuthUser, LoginData, SignupData } from './auth.types.ts';

/**
 * @param data
 * @throws {ApiError}
 */
export const signup = ({ email, username, nickname, password }: SignupData) =>
  request<AuthUser>('/signup', { method: 'POST', data: { email, username, nickname, password } });

/**
 * @param data
 * @throws {ApiError}
 */
export const login = ({ login, password }: LoginData) =>
  request<AuthUser>('/login', { method: 'POST', data: { login, password } });

/**
 * @throws {ApiError}
 */
export const logout = () => request<unknown>('/logout', { method: 'POST' });
