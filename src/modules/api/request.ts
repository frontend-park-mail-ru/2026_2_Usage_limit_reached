import { API_BASE_URL } from './config.ts';

export class ApiError extends Error {
  status: number;

  /**
   * @param status - HTTP-статус ответа или 0 при сетевой ошибке.
   */
  constructor(status: number, message: string) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
  }
}

interface RequestOptions {
  method?: string;
  data?: object;
  responseType?: 'json' | 'empty';
}

/**
 * Выполняет запрос к backend с cookie.
 * По умолчанию ожидает JSON; при responseType="empty" возвращает undefined.
 * @param path
 * @param options
 * @throws {ApiError} При ошибке сети, HTTP или разбора JSON.
 */
export const request = async <T>(path: string, { method = 'GET', data, responseType = 'json' }: RequestOptions = {}): Promise<T> => {
  let response: Response;
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

  if (response.ok && responseType === 'empty') {
    return undefined as T;
  }

  let json: unknown;
  try {
    json = await response.json();
  } catch {
    throw new ApiError(response.status, response.ok ? 'invalid JSON response' : 'unknown error');
  }

  if (!response.ok) {
    const message = typeof json === 'object' && json !== null
      && 'error' in json && typeof json.error === 'string' ? json.error : 'unknown error';
    throw new ApiError(response.status, message);
  }
  return json as T;
};
