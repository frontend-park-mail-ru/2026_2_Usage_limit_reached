import { request } from './request.ts';
import type { CreatedPost, Post, PostInput, PostsPage, PostsQuery, PostUpdate } from './posts.types.ts';

/**
 * Собирает параметры списка постов.
 * @param query
 */
const buildPostsQuery = ({ sort, cursor }: PostsQuery): string => {
  const params = new URLSearchParams({ sort });
  if (cursor) {
    params.set('cursor', cursor);
  }
  return params.toString();
};

/**
 * Адрес одного поста.
 * @param id
 */
const postPath = (id: string): string => `/posts/${encodeURIComponent(id)}`;

/**
 * Получает страницу опубликованных постов текущего пользователя.
 * @param query
 * @throws {ApiError}
 */
export const getMyPosts = (query: PostsQuery) => request<PostsPage>(`/profile/me/posts?${buildPostsQuery(query)}`);

/**
 * Получает страницу черновиков текущего пользователя.
 * @param query
 * @throws {ApiError}
 */
export const getMyDrafts = (query: PostsQuery) => request<PostsPage>(`/profile/me/drafts?${buildPostsQuery(query)}`);

/**
 * Получает пост целиком.
 * @param id
 * @throws {ApiError}
 */
export const getPost = (id: string) => request<Post>(postPath(id));

/**
 * Создаёт пост.
 * @param data
 * @throws {ApiError}
 */
export const createPost = (data: PostInput) => request<CreatedPost>('/posts', { method: 'POST', data });

/**
 * Сохраняет изменения поста.
 * @param id
 * @param data
 * @throws {ApiError}
 */
export const updatePost = (id: string, data: PostUpdate) =>
  request<void>(postPath(id), { method: 'PUT', data, responseType: 'empty' });

/**
 * Удаляет пост.
 * @param id
 * @throws {ApiError}
 */
export const deletePost = (id: string) => request<void>(postPath(id), { method: 'DELETE', responseType: 'empty' });
