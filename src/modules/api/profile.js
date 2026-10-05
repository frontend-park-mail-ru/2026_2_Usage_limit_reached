import { request } from './request.js';

/**
 * Получает профиль текущего пользователя.
 * @returns {Promise<Object>} Данные профиля.
 */
export const getProfile = () => request('/profile/me');

/**
 * Получает посты текущего пользователя.
 * @returns {Promise<Object>} Данные постов.
 */
export const getProfilePosts = () => request('/profile/me/posts');
