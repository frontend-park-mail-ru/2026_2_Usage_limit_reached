import type { Navigate } from './paths.ts';
import type { SetRefreshNotice } from '../components/refreshNotice/refreshNotice.types.ts';

export type Layout = 'plain' | 'sidebar';

export interface Route {
  title: string;
  render: () => string;
  init?: (root: HTMLElement, navigate: Navigate, setRefreshNotice: SetRefreshNotice) => void | (() => void) | Promise<void>;
  layout?: Layout;
}
