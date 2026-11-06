import { request } from './request.ts';
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
  request<void>('/profile/me', { method: 'PUT', data, responseType: 'empty' });

/**
 * Загружает аватар.
 * @param file
 * @throws {ApiError}
 */
export const uploadAvatar = (file: Blob) => {
  const data = new FormData();
  data.append('avatar', file);
  return request<AvatarResponse>('/profile/me/avatar', { method: 'PUT', data });
};

/**
 * Удаляет аватар.
 * @throws {ApiError}
 */
export const deleteAvatar = () => request<void>('/profile/me/avatar', { method: 'DELETE', responseType: 'empty' });

/**
 * Получает посты текущего пользователя.
 * @throws {ApiError}
 */
export const getProfilePosts = () => request<ProfilePosts>('/profile/me/posts');
