import type { RouteMatch, RouteParams } from './router.types.ts';

export const ROUTES = {
  home: '/',
  login: '/login',
  register: '/register',
  profile: '/profile',
  settings: '/settings',
  postNew: '/posts/new',
  postEdit: '/posts/:id/edit',
} as const;

export type RoutePattern = (typeof ROUTES)[keyof typeof ROUTES];

type FillParams<P extends string> = P extends `${infer Head}:${string}/${infer Tail}`
  ? `${Head}${string}/${FillParams<Tail>}`
  : P extends `${infer Head}:${string}` ? `${Head}${string}` : P;

export type RoutePath = FillParams<RoutePattern>;

export type NavigationPath = RoutePath | `${RoutePath}?${string}`;

export interface NavigateOptions {
  replace?: boolean;
  force?: boolean;
}

export type Navigate = (path: NavigationPath, options?: NavigateOptions) => void;

const PATTERNS: readonly RoutePattern[] = Object.values(ROUTES);

/**
 * Сравнивает адрес с шаблоном маршрута.
 * @param pattern
 * @param path
 */
function matchPattern(pattern: RoutePattern, path: string): RouteParams | undefined {
  const patternParts = pattern.split('/');
  const pathParts = path.split('/');
  if (patternParts.length !== pathParts.length) {
    return undefined;
  }
  const params: RouteParams = {};
  for (const [index, part] of patternParts.entries()) {
    const value = pathParts[index];
    if (part.startsWith(':') && value) {
      params[part.slice(1)] = decodeURIComponent(value);
    } else if (part !== value) {
      return undefined;
    }
  }
  return params;
}

/**
 * Находит маршрут и параметры для адреса.
 * @param path
 */
export function matchRoute(path: string): RouteMatch | undefined {
  try {
    for (const pattern of PATTERNS) {
      const params = matchPattern(pattern, path);
      if (params) {
        return { pattern, params };
      }
    }
  } catch {
    return undefined;
  }
  return undefined;
}

/**
 * Адрес редактирования поста.
 * @param id
 */
export const postEditRoute = (id: string): RoutePath => `/posts/${encodeURIComponent(id)}/edit`;

/**
 * Проверяет, входит ли адрес в список маршрутов приложения.
 * @param path
 */
export const isRoutePath = (path: string): path is RoutePath => !!matchRoute(path);
