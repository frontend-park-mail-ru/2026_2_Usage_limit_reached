import { API_BASE_URL } from './config.js';

/**
 * Ошибка запроса к API: сервер ответил ошибкой или не ответил вовсе.
 */
export class ApiError extends Error {
  /**
   * @param {number} status - HTTP-код ошибки или 0, если сервер недоступен.
   * @param {string} message - Текст ошибки от сервера.
   */
  constructor(status, message) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
  }
}

/**
 * Отправляет запрос к бэкенду и возвращает тело ответа.
 * @param {string} path - Путь запроса, например '/login'.
 * @param {Object} [options] - Параметры запроса.
 * @param {string} [options.method='GET'] - HTTP-метод.
 * @param {Object} [options.data] - Данные, которые уйдут в теле запроса как JSON.
 * @returns {Promise<*>} Тело ответа сервера, разобранное из JSON.
 * @throws {ApiError} Если сервер вернул ошибку или недоступен.
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
