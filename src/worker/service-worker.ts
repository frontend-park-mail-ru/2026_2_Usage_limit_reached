declare const self: ServiceWorkerGlobalScope;
declare const __APP_PRECACHE__: {
  version: string;
  assets: { url: string; revision: string }[];
};

const CACHE_PREFIX = 'usage-limit-reached-app-';
const CACHE_NAME = CACHE_PREFIX + __APP_PRECACHE__.version;
const assetPaths = new Set(__APP_PRECACHE__.assets.map(({ url }) => url));

/** Полностью подготавливает новую сборку, при ошибке удаляет её незавершённый кэш. */
async function cacheApplication(): Promise<void> {
  try {
    const cache = await caches.open(CACHE_NAME);
    await cache.addAll([...assetPaths].map((url) => new Request(url, {
      cache: 'reload',
      credentials: 'omit',
    })));
  } catch (error) {
    await caches.delete(CACHE_NAME);
    throw error;
  }
}

/** Удаляет только старые кэши приложения после смены активного worker. */
async function activateApplication(): Promise<void> {
  const names = await caches.keys();
  await Promise.all(names
    .filter((name) => name.startsWith(CACHE_PREFIX) && name !== CACHE_NAME)
    .map((name) => caches.delete(name)));
  await self.clients.claim();
}

/** Возвращает ресурс именно активной сборки, не смешивая версии приложения. */
async function readApplicationAsset(request: Request): Promise<Response> {
  const cache = await caches.open(CACHE_NAME);
  return await cache.match(request) ?? fetch(request);
}

/** Обрабатывает только ресурсы сборки и переходы по SPA, API остаётся в сети. */
function handleFetch(event: FetchEvent): void {
  const { request } = event;
  const url = new URL(request.url);
  if (request.method !== 'GET' || url.origin !== self.location.origin) {
    return;
  }
  if (assetPaths.has(url.pathname) && !url.search) {
    event.respondWith(readApplicationAsset(request));
    return;
  }
  const isResource = url.pathname.startsWith('/assets/') || /\.[^/]+$/.test(url.pathname);
  if (request.mode === 'navigate' && !isResource) {
    event.respondWith(readApplicationAsset(new Request(new URL('/index.html', self.location.origin))));
  }
}

self.addEventListener('install', (event) => event.waitUntil(cacheApplication()));
self.addEventListener('activate', (event) => event.waitUntil(activateApplication()));
self.addEventListener('fetch', handleFetch);

export {};
