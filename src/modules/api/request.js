import { API_BASE_URL } from './config.js';

/**
 * Ошибка запроса к API
 */
export class ApiError extends Error {
  /**
   * @param {number} status
   * @param {string} message
   */
  constructor(status, message) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
  }
}

/**
 * Запрос на бэкенд
 * @param {string} path
 * @param {Object} [options]
 * @param {string} [options.method='GET']
 * @param {Object} [options.data]
 * @returns {Promise<*>}
 * @throws {ApiError}
 */
export const request = async (path, { method = 'GET', data } = {}) => {
  let response;
  try {
    response = await fetch(`${API_BASE_URL}${path}`, {
      method,
      credentials: 'include',
      headers: data ? { 'Content-Type': 'application/json' } : {},
      body: data ? JSON.stringify(data) : undefined,
    });
  } catch {
    throw new ApiError(0, 'network error');
  }

  const json = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new ApiError(response.status, json.error ?? 'unknown error');
  }
  return json;
};
