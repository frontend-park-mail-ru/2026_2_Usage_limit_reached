import { request } from './request.js';
import type { AuthUser, LoginData, SignupData } from './auth.types.js';

export const signup = ({ email, username, nickname, password }: SignupData) =>
  request<AuthUser>('/signup', { method: 'POST', data: { email, username, nickname, password } });

export const login = ({ login, password }: LoginData) =>
  request<AuthUser>('/login', { method: 'POST', data: { login, password } });

export const logout = () => request<unknown>('/logout', { method: 'POST' });
