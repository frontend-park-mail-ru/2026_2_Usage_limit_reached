declare const self: ServiceWorkerGlobalScope;

/** Отмечает установку worker без перехвата запросов. */
function handleInstall(): void {
  console.info('Service Worker установлен');
}

self.addEventListener('install', handleInstall);

export {};
