export type OnlineConfSection = 'configs' | 'flags';

export interface OnlineConfScope {
  id: string;
  name: string;
}

export interface OnlineConfListItem {
  name: string;
}

export interface OnlineConfListResponse<T> {
  items: T[];
}

export interface OnlineConfListQuery {
  scope: string;
  q?: string;
}
