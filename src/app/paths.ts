export const ROUTES = {
  home: '/',
  login: '/login',
  register: '/register',
  profile: '/profile',
} as const;

export type RoutePath = (typeof ROUTES)[keyof typeof ROUTES];

export interface NavigateOptions {
  replace?: boolean;
}

export type Navigate = (path: RoutePath, options?: NavigateOptions) => void;

const PATHS: readonly string[] = Object.values(ROUTES);

export const isRoutePath = (path: string): path is RoutePath => PATHS.includes(path);
