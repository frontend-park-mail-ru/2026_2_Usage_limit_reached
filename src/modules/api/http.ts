import { API_BASE_URL } from './config.ts';
import { ApiError } from './apiError.ts';
import { API_READ_TIMEOUT, API_WRITE_TIMEOUT } from './request.constants.ts';
import type { RequestOptions } from './request.types.ts';

interface HttpOptions extends RequestOptions {
  headers?: HeadersInit;
  cache?: RequestCache;
  redirect?: RequestRedirect;
}

/** Принимает только пути нашего API, без смены origin. */
function getApiUrl(path: string): string {
  if (!path.startsWith('/') || path.startsWith('//')) {
    throw new ApiError(0, 'invalid API path');
  }
  const base = new URL(API_BASE_URL);
  let url: URL;
  try {
    url = new URL(`${API_BASE_URL}${path}`);
  } catch {
    throw new ApiError(0, 'invalid API path');
  }
  if (url.origin !== base.origin || url.username || url.password) {
    throw new ApiError(0, 'invalid API path');
  }
  return url.href;
}

/** Отправляет HTTP-запрос без получения CSRF-токена. */
export async function sendRequest<T>(path: string, {
  method = 'GET', data, responseType = 'json', headers: extraHeaders, cache, redirect,
}: HttpOptions = {}): Promise<T> {
  const url = getApiUrl(path);
  const headers = new Headers(extraHeaders);
  let body: BodyInit | undefined;
  if (data instanceof FormData) {
    body = data;
  } else if (data) {
    headers.set('Content-Type', 'application/json');
    body = JSON.stringify(data);
  }
  const isRead = ['GET', 'HEAD', 'OPTIONS'].includes(method);
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), isRead ? API_READ_TIMEOUT : API_WRITE_TIMEOUT);
  try {
    let response: Response;
    try {
      response = await fetch(url, {
        method, credentials: 'include', signal: controller.signal, headers, body, cache, redirect,
      });
    } catch {
      throw new ApiError(0, controller.signal.aborted && !isRead ? 'mutation_timeout' : 'network error');
    }
    if (response.ok && responseType === 'empty') {
      return undefined as T;
    }
    let json: unknown;
    try {
      json = await response.json();
    } catch {
      // Известный HTTP-статус сохраняется даже при ошибке чтения тела.
      if (!response.ok) {
        throw new ApiError(response.status, 'unknown error');
      }
      if (controller.signal.aborted) {
        throw isRead
          ? new ApiError(0, 'network error')
          : new ApiError(response.status, 'mutation_timeout');
      }
      throw new ApiError(response.status, 'invalid JSON response');
    }
    if (!response.ok) {
      const code = typeof json === 'object' && json !== null
        && 'error' in json && typeof json.error === 'string' ? json.error : 'unknown error';
      throw new ApiError(response.status, code);
    }
    return json as T;
  } finally {
    clearTimeout(timer);
  }
}
