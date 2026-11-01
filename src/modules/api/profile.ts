import { request } from './request.ts';
import type { Profile, ProfilePosts } from './profile.types.ts';

/**
 * Получает профиль текущего пользователя.
 * @throws {ApiError}
 */
export const getProfile = () => request<Profile>('/profile/me');

/**
 * Получает посты текущего пользователя.
 * @throws {ApiError}
 */
export const getProfilePosts = () => request<ProfilePosts>('/profile/me/posts');
