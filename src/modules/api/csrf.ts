import { ApiError } from './apiError.ts';
import { sendRequest } from './http.ts';

interface CsrfToken {
  value: string;
  version: number;
}

let version = 0;
let token: string | undefined;
let pending: Promise<CsrfToken> | undefined;
let channel: BroadcastChannel | undefined;

/** Версия позволяет отменить действие, ожидающее токен прежнего контекста. */
export function getCsrfVersion(): number {
  return version;
}

/** Отклоняет ожидающие действия, сохраняя токен той же серверной сессии. */
export function invalidateCsrfRequests(): void {
  version += 1;
  pending = undefined;
}

/** Отзывает токен только ожидаемого контекста, не затрагивая более новый. */
export function resetCsrfToken(expectedVersion = version): void {
  if (expectedVersion !== version) {
    return;
  }
  invalidateCsrfRequests();
  token = undefined;
}

/** Возвращает токен синхронно, чтобы не добавлять ожидание перед готовым запросом. */
export function getCachedCsrfToken(): CsrfToken | undefined {
  return token === undefined ? undefined : { value: token, version };
}

/** Объединяет получение токена и не принимает ответ прежнего контекста. */
export function getCsrfToken(): Promise<CsrfToken> {
  const cached = getCachedCsrfToken();
  if (cached) {
    return Promise.resolve(cached);
  }
  if (pending) {
    return pending;
  }
  const expectedVersion = version;
  const promise = sendRequest<unknown>('/csrf', { cache: 'no-store', redirect: 'error' })
    .then((response) => {
      if (expectedVersion !== version) {
        throw new ApiError(0, 'csrf_context_changed', 'csrf');
      }
      if (typeof response !== 'object' || response === null || !('csrf_token' in response)
        || typeof response.csrf_token !== 'string' || !/^[\x21-\x7e]+$/.test(response.csrf_token)) {
        throw new ApiError(200, 'invalid CSRF response', 'csrf');
      }
      token = response.csrf_token;
      return { value: token, version: expectedVersion };
    })
    .catch((error: unknown) => {
      throw error instanceof ApiError
        ? new ApiError(error.status, error.code, 'csrf')
        : new ApiError(0, 'csrf_unavailable', 'csrf');
    })
    .finally(() => {
      if (pending === promise) {
        pending = undefined;
      }
    });
  pending = promise;
  return promise;
}

/** Сообщает об изменении авторизации, не передавая токен или данные пользователя. */
export function notifyCsrfSessionChange(): void {
  channel?.postMessage('session-changed');
}

/** Слушает смену авторизации даже при отсутствии персональной offline-копии. */
export function initCsrfSync(onChange: () => void): () => void {
  if (!('BroadcastChannel' in globalThis)) {
    return () => {};
  }
  const current = new BroadcastChannel('usage-limit-reached-auth');
  channel = current;
  current.onmessage = (event: MessageEvent<unknown>) => {
    if (event.data === 'session-changed') {
      onChange();
    }
  };
  return () => {
    current.close();
    if (channel === current) {
      channel = undefined;
    }
  };
}
