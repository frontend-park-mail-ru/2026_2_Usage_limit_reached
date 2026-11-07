import { ApiError } from './apiError.ts';
import { getCachedCsrfToken, getCsrfToken, getCsrfVersion, resetCsrfToken } from './csrf.ts';
import { sendRequest } from './http.ts';
import type { RequestOptions } from './http.ts';

export { ApiError } from './apiError.ts';

/**
 * Выполняет запрос к backend с cookie и CSRF-токеном для изменяющих действий.
 * По умолчанию ожидает JSON; при responseType="empty" возвращает undefined.
 * @param path
 * @param options
 * @throws {ApiError} При ошибке подготовки запроса, сети, HTTP или разбора JSON.
 */
export async function request<T>(path: string, { method = 'GET', ...options }: RequestOptions = {}): Promise<T> {
  method = method.toUpperCase();
  if (!['POST', 'PUT', 'PATCH', 'DELETE'].includes(method)) {
    return sendRequest<T>(path, { ...options, method });
  }
  const version = getCsrfVersion();
  const token = getCachedCsrfToken() ?? await getCsrfToken();
  if (version !== getCsrfVersion()) {
    throw new ApiError(0, 'csrf_context_changed', 'csrf');
  }
  try {
    return await sendRequest<T>(path, {
      ...options, method, headers: { 'X-CSRF-Token': token.value }, redirect: 'error',
    });
  } catch (error) {
    if (error instanceof ApiError && error.isCsrfFailure) {
      resetCsrfToken(token.version);
    }
    throw error;
  }
}
