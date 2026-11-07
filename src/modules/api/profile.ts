import { request } from './request.ts';
import { sessionRequest } from './session.ts';
import type { AvatarResponse, Profile, ProfilePosts, ProfileUpdate } from './profile.types.ts';

/**
 * Получает профиль текущего пользователя.
 * @throws {ApiError}
 */
export const getProfile = () => request<Profile>('/profile/me');

/**
 * Сохраняет профиль.
 * @param data
 * @throws {ApiError}
 */
export const updateProfile = (data: ProfileUpdate) =>
  sessionRequest<void>('/profile/me', { method: 'PUT', data, responseType: 'empty' }, () => ({
    username: data.user.username,
    nickname: data.user.nickname,
  }));

/**
 * Загружает аватар.
 * @param file
 * @throws {ApiError}
 */
export const uploadAvatar = (file: Blob) => {
  const data = new FormData();
  data.append('avatar', file);
  return sessionRequest<AvatarResponse>('/profile/me/avatar', { method: 'PUT', data }, ({ avatar_url }) => ({ avatar_url }));
};

/**
 * Удаляет аватар.
 * @throws {ApiError}
 */
export const deleteAvatar = () =>
  sessionRequest<void>('/profile/me/avatar', { method: 'DELETE', responseType: 'empty' }, () => ({ avatar_url: undefined }));

/**
 * Получает посты текущего пользователя.
 * @throws {ApiError}
 */
export const getProfilePosts = () => request<ProfilePosts>('/profile/me/posts');
