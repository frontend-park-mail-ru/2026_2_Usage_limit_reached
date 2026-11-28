import { ApiError } from './apiError.ts';
import { sendRequest } from './http.ts';
import { request } from './request.ts';
import type {
  OnlineConfConfig,
  OnlineConfConfigKey,
  OnlineConfFlag,
  OnlineConfFlagInput,
  OnlineConfHistoryPage,
  OnlineConfJsonValue,
  OnlineConfListItem,
  OnlineConfListQuery,
  OnlineConfListResponse,
  OnlineConfScope,
  OnlineConfSection,
} from './onlineConf.types.ts';

interface OnlineConfListEntry {
  name?: string;
  key?: string;
  force_on_user_ids?: string[];
  force_off_user_ids?: string[];
}

interface OnlineConfConfigResponse {
  scope: string;
  key: string;
  value: string;
  description?: string;
}

interface OnlineConfFlagResponse {
  scope: string;
  key: string;
  rollout_percent: number;
  force_on_user_ids: string[];
  force_off_user_ids: string[];
}

function flagOverrides(item: OnlineConfListEntry) {
  return { include_user_ids: item.force_on_user_ids, exclude_user_ids: item.force_off_user_ids };
}

function decodeConfig({ scope, key, value, description }: OnlineConfConfigResponse): OnlineConfConfig {
  return { scope, name: key, value: JSON.parse(value) as OnlineConfJsonValue, description };
}

function encodeConfigValue(value: OnlineConfJsonValue) {
  return {
    value: JSON.stringify(value),
    value_type: Array.isArray(value) ? 'array' : value !== null && typeof value === 'object' ? 'json' : 'scalar',
  };
}

/** @throws {ApiError} */
export async function checkAdminAccess(signal: AbortSignal): Promise<void> {
  const result = await sendRequest<unknown>('/onlineconf/admin/access', {
    signal,
    cache: 'no-store',
    redirect: 'error',
  });
  if (
    typeof result !== 'object'
    || result === null
    || !('allowed' in result)
    || result.allowed !== true
  ) {
    throw new ApiError(200, 'invalid OnlineConf access response');
  }
}

/** @throws {ApiError} */
export async function getOnlineConfScopes(signal: AbortSignal): Promise<OnlineConfListResponse<OnlineConfScope>> {
  const result = await sendRequest<OnlineConfListResponse<OnlineConfScope> | { name: string }[]>(
    '/onlineconf/admin/scopes', { signal, cache: 'no-store', redirect: 'error' },
  );
  return Array.isArray(result) ? { items: result.map(({ name }) => ({ id: name, name })) } : result;
}

/** @throws {ApiError} */
export async function getOnlineConfList(
  section: OnlineConfSection,
  { scope, q }: OnlineConfListQuery,
  signal: AbortSignal,
): Promise<OnlineConfListResponse<OnlineConfListItem>> {
  const params = new URLSearchParams({ scope });
  const search = q?.trim();
  if (search) {
    params.set('q', search);
  }
  const response = await sendRequest<OnlineConfListResponse<OnlineConfListEntry> | OnlineConfListEntry[]>(
    `/onlineconf/admin/${section}?${params}`, { signal, cache: 'no-store', redirect: 'error' },
  );
  const page = Array.isArray(response) ? { items: response } : response;
  return { ...page, items: page.items.map((item) => ({
    ...item,
    name: item.key ?? item.name ?? '',
    ...(section === 'flags' && flagOverrides(item)),
  })) };
}

/** Читает страницу истории ресурса в порядке сервера. */
export function getOnlineConfHistory(section: OnlineConfSection, scope: string, key: string, signal: AbortSignal, cursor?: string) {
  if (!scope.trim() || !key.trim()) {
    throw new ApiError(0, 'missing history resource');
  }
  const params = new URLSearchParams({ entity_type: section === 'configs' ? 'config' : 'flag', scope, key });
  if (cursor) {
    params.set('cursor', cursor);
  }
  return sendRequest<OnlineConfHistoryPage>(`/onlineconf/admin/history?${params}`, { signal, cache: 'no-store', redirect: 'error' });
}

function resourcePath(section: OnlineConfSection, { scope, name }: OnlineConfConfigKey): string {
  return `/onlineconf/admin/${section}/${encodeURIComponent(scope)}/${encodeURIComponent(name)}`;
}

/** @throws {ApiError} */
export async function getOnlineConfConfig(key: OnlineConfConfigKey, signal: AbortSignal): Promise<OnlineConfConfig> {
  return decodeConfig(await sendRequest<OnlineConfConfigResponse>(resourcePath('configs', key), {
    signal, cache: 'no-store', redirect: 'error',
  }));
}

/** @throws {ApiError} */
export function createOnlineConfConfig({ scope, name, value }: OnlineConfConfig, signal: AbortSignal) {
  return request<void>('/onlineconf/admin/configs', {
    method: 'POST', data: { scope, key: name, ...encodeConfigValue(value) }, signal, responseType: 'empty',
  });
}

/** @throws {ApiError} */
export function updateOnlineConfConfig(
  key: OnlineConfConfigKey,
  value: OnlineConfJsonValue,
  description: string | undefined,
  signal: AbortSignal,
) {
  return request<void>(resourcePath('configs', key), {
    method: 'PUT', data: { ...encodeConfigValue(value), description }, signal, responseType: 'empty',
  });
}

/** Создаёт флаг в выбранном скоупе. */
export const createOnlineConfFlag = ({ name, ...data }: OnlineConfFlagInput, signal: AbortSignal) =>
  request<void>('/onlineconf/admin/flags', { method: 'POST', data: { ...data, key: name }, signal, responseType: 'empty' });

export async function getOnlineConfFlag(flag: OnlineConfConfigKey, signal: AbortSignal): Promise<OnlineConfFlag> {
  const result = await sendRequest<OnlineConfFlagResponse>(resourcePath('flags', flag), {
    signal, cache: 'no-store', redirect: 'error',
  });
  return { ...result, name: result.key, ...flagOverrides(result) };
}

export const updateOnlineConfRollout = (flag: OnlineConfConfigKey, percent: number, signal: AbortSignal) =>
  request<void>(`${resourcePath('flags', flag)}/rollout`, {
    method: 'PUT', data: { percent }, signal, responseType: 'empty',
  });

export const setOnlineConfForce = (flag: OnlineConfConfigKey, userId: string, force: 'on' | 'off', signal: AbortSignal) =>
  request<void>(`${resourcePath('flags', flag)}/force`, {
    method: 'POST', data: { user_id: userId, force }, signal, responseType: 'empty',
  });

export const removeOnlineConfForce = (flag: OnlineConfConfigKey, userId: string, signal: AbortSignal) =>
  request<void>(`${resourcePath('flags', flag)}/force/${encodeURIComponent(userId)}`, {
    method: 'DELETE', signal, responseType: 'empty',
  });
