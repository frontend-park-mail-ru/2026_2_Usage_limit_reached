export type Layout = 'plain' | 'sidebar';

export interface Route {
  render: () => string;
  init?: (root: HTMLElement) => void;
  layout?: Layout;
}
