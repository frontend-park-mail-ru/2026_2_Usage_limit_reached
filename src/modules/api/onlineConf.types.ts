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

export interface OnlineConfHistoryPage {
  items: {
    actor_id?: string;
    action: string;
    created_at: string;
    old_value?: OnlineConfJsonValue;
    new_value?: OnlineConfJsonValue;
  }[];
  cursor?: string;
}
