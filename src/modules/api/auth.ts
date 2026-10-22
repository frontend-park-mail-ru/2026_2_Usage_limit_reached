import { request } from './request.js';

export type SignupData = {
  email: string;
  username: string;
  nickname: string;
  password: string;
};

export type LoginData = {
  login: string;
  password: string;
};

export type AuthUser = {
  email: string;
  username: string;
  nickname: string;
};

export const signup = ({ email, username, nickname, password }: SignupData) =>
  request<AuthUser>('/signup', { method: 'POST', data: { email, username, nickname, password } });

export const login = ({ login, password }: LoginData) =>
  request<AuthUser>('/login', { method: 'POST', data: { login, password } });

export const logout = () => request<unknown>('/logout', { method: 'POST' });
