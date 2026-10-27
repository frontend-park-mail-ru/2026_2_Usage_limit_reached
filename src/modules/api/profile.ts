import { request } from './request.js';
import type { Profile, ProfilePosts } from './profile.types.js';

export const getProfile = () => request<Profile>('/profile/me');

export const getProfilePosts = () => request<ProfilePosts>('/profile/me/posts');
