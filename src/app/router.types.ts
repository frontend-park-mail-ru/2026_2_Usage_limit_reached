import type { Navigate } from './paths.ts';

export type Layout = 'plain' | 'sidebar';

export interface Route {
  title: string;
  render: () => string;
  init?: (root: HTMLElement, navigate: Navigate) => void;
  layout?: Layout;
}
