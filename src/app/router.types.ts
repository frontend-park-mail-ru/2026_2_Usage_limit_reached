import type { Navigate, RoutePattern } from './paths.ts';
import type { SetRefreshNotice } from '../components/refreshNotice/refreshNotice.types.ts';

export type Layout = 'plain' | 'sidebar';

export type RouteParams = Record<string, string>;

export interface Route {
  title: string;
  render: () => string;
  init?: (
    root: HTMLElement,
    navigate: Navigate,
    params: RouteParams,
    setRefreshNotice: SetRefreshNotice
  ) => void | (() => void) | Promise<void>;
  layout?: Layout;
}

export interface RouteMatch {
  pattern: RoutePattern;
  params: RouteParams;
}

export interface LeaveGuard {
  hasChanges: () => boolean;
  confirm: (leave: () => void) => void;
}
