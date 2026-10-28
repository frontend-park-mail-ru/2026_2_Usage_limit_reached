import { request } from './request.ts';
import type { Profile, ProfilePosts } from './profile.types.ts';

/**
 * @throws {ApiError}
 */
export const getProfile = () => request<Profile>('/profile/me');

/**
 * @throws {ApiError}
 */
export const getProfilePosts = () => request<ProfilePosts>('/profile/me/posts');
