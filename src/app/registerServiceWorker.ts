/** Регистрирует worker в production, ошибка регистрации не мешает запуску приложения. */
export async function registerServiceWorker(): Promise<void> {
  if (!__SERVICE_WORKER_ENABLED__ || !window.isSecureContext || !('serviceWorker' in navigator)) {
    return;
  }

  try {
    await navigator.serviceWorker.register('/sw.js', { scope: '/', updateViaCache: 'none' });
  } catch (error) {
    console.warn('Не удалось зарегистрировать Service Worker', error);
  }
}
