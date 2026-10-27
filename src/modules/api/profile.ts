import { request } from './request.js';
import type { Profile, ProfilePosts } from './profile.types.js';

/**
 * @throws {ApiError}
 */
export const getProfile = () => request<Profile>('/profile/me');

/**
 * @throws {ApiError}
 */
export const getProfilePosts = () => request<ProfilePosts>('/profile/me/posts');
