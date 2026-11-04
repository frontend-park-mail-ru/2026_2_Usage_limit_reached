import { request } from './request.ts';
import type { AvatarResponse, Profile, ProfilePosts, ProfilePostsQuery, ProfileUpdate } from './profile.types.ts';
import { DEFAULT_PROFILE_POSTS_QUERY } from './profile.constants.ts';

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
 * Загружает одну страницу, следующий cursor передаётся явно.
 * @param query
 * @throws {ApiError}
 */
export const getProfilePosts = ({ sort, limit, cursor }: ProfilePostsQuery = DEFAULT_PROFILE_POSTS_QUERY) => {
  const search = new URLSearchParams({ sort });
  if (limit !== undefined) {
    search.set('limit', String(limit));
  }
  if (cursor !== undefined) {
    search.set('cursor', cursor);
  }
  return request<ProfilePosts>(`/profile/me/posts?${search}`);
};
