export type OnlineConfSection = 'configs' | 'flags';

export interface OnlineConfScope {
  id: string;
  name: string;
}

export interface OnlineConfListItem {
  name: string;
}

export interface OnlineConfFlagOverrides {
  include_user_ids?: string[];
  exclude_user_ids?: string[];
}

export interface OnlineConfFlag extends OnlineConfListItem, OnlineConfFlagOverrides {
  id: string;
  rollout_percent: number;
}

export type OnlineConfFlagUpdate = OnlineConfFlagOverrides & Partial<Pick<OnlineConfFlag, 'rollout_percent'>>;
export type OnlineConfFlagInput = Omit<OnlineConfFlag, 'id'> & { scope: string };

export interface OnlineConfListResponse<T> {
  items: T[];
}

export interface OnlineConfListQuery {
  scope: string;
  q?: string;
}
