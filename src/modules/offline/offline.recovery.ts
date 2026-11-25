import { ApiError } from '@/modules/api/request.ts';

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

/** Проверяет открытый экран по таймеру и при возврате к вкладке. */
export function watchOfflineExpiry(check: () => number | undefined) {
  let timer: number | undefined;
  const refresh = () => {
    window.clearTimeout(timer);
    const deadline = check();
    if (deadline !== undefined) {
      timer = window.setTimeout(refresh, Math.max(0, Math.min(deadline - Date.now(), 2_147_483_647)));
    }
  };
  window.addEventListener('focus', refresh);
  window.addEventListener('pageshow', refresh);
  document.addEventListener('visibilitychange', refresh);
  return {
    refresh,
    destroy() {
      window.clearTimeout(timer);
      window.removeEventListener('focus', refresh);
      window.removeEventListener('pageshow', refresh);
      document.removeEventListener('visibilitychange', refresh);
    },
  };
}
