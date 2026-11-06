import { ApiError } from '../api/request.ts';

/** Отличает недоступность сервера от отказа в доступе и ошибки запроса. */
export function isBackendUnavailable(error: unknown): boolean {
  return error instanceof ApiError && [0, 502, 503, 504].includes(error.status);
}

/** Подключает повторные попытки только для текущей страницы и возвращает отключение. */
export function bindOfflineRecovery(retry: () => void, needsRetry: () => boolean): () => void {
  const recover = () => {
    if (document.visibilityState === 'visible' && needsRetry()) {
      retry();
    }
  };
  window.addEventListener('online', recover);
  window.addEventListener('focus', recover);
  document.addEventListener('visibilitychange', recover);
  return () => {
    window.removeEventListener('online', recover);
    window.removeEventListener('focus', recover);
    document.removeEventListener('visibilitychange', recover);
  };
}
