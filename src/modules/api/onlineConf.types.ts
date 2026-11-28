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

export type OnlineConfJsonValue =
  | null
  | boolean
  | number
  | string
  | OnlineConfJsonValue[]
  | OnlineConfJsonObject;

interface OnlineConfJsonObject {
  [key: string]: OnlineConfJsonValue;
}

export interface OnlineConfConfigKey {
  scope: string;
  name: string;
}

export interface OnlineConfConfig extends OnlineConfConfigKey {
  value: OnlineConfJsonValue;
}
