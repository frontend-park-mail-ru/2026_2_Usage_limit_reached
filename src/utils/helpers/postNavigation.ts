import { matchRoute, ROUTES } from '@/app/paths.ts';
import type { NavigationPath, RoutePath } from '@/app/paths.ts';

/** Безопасно разбирает локальный адрес без якоря. */
function parseLocalPath(value: unknown): URL | undefined {
  if (typeof value !== 'string' || !value.startsWith('/') || value.startsWith('//')) {
    return undefined;
  }
  try {
    const url = new URL(value, window.location.origin);
    return url.origin === window.location.origin && !url.hash ? url : undefined;
  } catch {
    return undefined;
  }
}

/** Принимает только локальные адреса списков, из которых открывают посты. */
export function getPostListPath(value: unknown): NavigationPath | undefined {
  const url = parseLocalPath(value);
  if (!url) {
    return undefined;
  }
  const pattern = matchRoute(url.pathname)?.pattern;
  if (pattern !== ROUTES.home && pattern !== ROUTES.feed
    && pattern !== ROUTES.profile && pattern !== ROUTES.publicProfile) {
    return undefined;
  }
  return (url.pathname + url.search) as NavigationPath;
}

/** Восстанавливает источник из ссылки или истории, в том числе после редактора. */
export function getPostReturnPath(fallback: NavigationPath = ROUTES.home): NavigationPath {
  const explicit = getPostListPath(new URLSearchParams(window.location.search).get('returnTo'));
  if (explicit) {
    return explicit;
  }
  const from: unknown = history.state?.from;
  const list = getPostListPath(from);
  if (list) {
    return list;
  }
  const url = parseLocalPath(from);
  if (url) {
    const pattern = matchRoute(url.pathname)?.pattern;
    if (pattern === ROUTES.post || pattern === ROUTES.postEdit || pattern === ROUTES.postNew) {
      return getPostListPath(url.searchParams.get('returnTo')) ?? fallback;
    }
  }
  return fallback;
}

/** Сохраняет источник в адресе для перезагрузки и открытия в новой вкладке. */
export function withPostReturnPath(path: RoutePath, returnTo?: NavigationPath): NavigationPath {
  return returnTo ? `${path}?${new URLSearchParams({ returnTo })}` : path;
}
