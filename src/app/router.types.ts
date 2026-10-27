import type { Navigate } from './paths.js';

export type Layout = 'plain' | 'sidebar';

export interface Route {
  render: () => string;
  init?: (root: HTMLElement, navigate: Navigate) => void;
  layout?: Layout;
}
