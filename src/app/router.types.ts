export type Layout = 'plain' | 'sidebar';

export interface Route {
  title: string;
  render: () => string;
  init?: (root: HTMLElement) => void;
  layout?: Layout;
}
