import { API_BASE_URL } from './config.ts';
import { API_ERROR_MESSAGES, UNKNOWN_API_ERROR, API_READ_TIMEOUT } from './request.constants.ts';

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

  /** Сообщение для показа пользователю. */
  get text(): string {
    return API_ERROR_MESSAGES[this.status] ?? UNKNOWN_API_ERROR;
  }
}

interface RequestOptions {
  method?: string;
  data?: object | FormData;
  responseType?: 'json' | 'empty';
}

/**
 * Тело и заголовки запроса.
 * @param data
 */
const buildBody = (data?: object | FormData): Pick<RequestInit, 'headers' | 'body'> => {
  if (data instanceof FormData) {
    return { body: data };
  }
  if (data) {
    return { headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) };
  }
  return {};
};

/**
 * Выполняет запрос к backend с cookie.
 * По умолчанию ожидает JSON; при responseType="empty" возвращает undefined.
 * @param path
 * @param options
 * @throws {ApiError} При ошибке сети, HTTP или разбора JSON.
 */
export const request = async <T>(path: string, { method = 'GET', data, responseType = 'json' }: RequestOptions = {}): Promise<T> => {
  const controller = method === 'GET' ? new AbortController() : undefined;
  const timer = controller ? setTimeout(() => controller.abort(), API_READ_TIMEOUT) : undefined;
  try {
    let response: Response;
    try {
      response = await fetch(`${API_BASE_URL}${path}`, {
        method,
        credentials: 'include',
        signal: controller?.signal,
        ...buildBody(data),
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
      // Известный HTTP-статус отказа сохраняется даже при ошибке чтения тела.
      if (!response.ok) {
        throw new ApiError(response.status, 'unknown error');
      }
      if (controller?.signal.aborted) {
        throw new ApiError(0, 'request timeout');
      }
      throw new ApiError(response.status, response.ok ? 'invalid JSON response' : 'unknown error');
    }
  
    if (!response.ok) {
      const message = typeof json === 'object' && json !== null
        && 'error' in json && typeof json.error === 'string' ? json.error : 'unknown error';
      throw new ApiError(response.status, message);
    }
    return json as T;
  } finally {
    clearTimeout(timer);
  }
};
