import { ApiError } from './apiError.ts';
import { sendRequest } from './http.ts';
import { request } from './request.ts';
import type {
  OnlineConfConfig,
  OnlineConfConfigKey,
  OnlineConfJsonValue,
  OnlineConfListItem,
  OnlineConfListQuery,
  OnlineConfListResponse,
  OnlineConfScope,
  OnlineConfSection,
} from './onlineConf.types.ts';

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
export function getOnlineConfScopes(signal: AbortSignal): Promise<OnlineConfListResponse<OnlineConfScope>> {
  return sendRequest('/onlineconf/admin/scopes', { signal, cache: 'no-store', redirect: 'error' });
}

/** @throws {ApiError} */
export function getOnlineConfList(
  section: OnlineConfSection,
  { scope, q }: OnlineConfListQuery,
  signal: AbortSignal,
): Promise<OnlineConfListResponse<OnlineConfListItem>> {
  const params = new URLSearchParams({ scope });
  const search = q?.trim();
  if (search) {
    params.set('q', search);
  }
  return sendRequest(`/onlineconf/admin/${section}?${params}`, { signal, cache: 'no-store', redirect: 'error' });
}

function configItemPath({ scope, name }: OnlineConfConfigKey): string {
  return `/onlineconf/admin/configs/item?${new URLSearchParams({ scope, name })}`;
}

/** @throws {ApiError} */
export function getOnlineConfConfig(key: OnlineConfConfigKey, signal: AbortSignal): Promise<OnlineConfConfig> {
  return sendRequest(configItemPath(key), { signal, cache: 'no-store', redirect: 'error' });
}

/** @throws {ApiError} */
export function createOnlineConfConfig(data: OnlineConfConfig, signal: AbortSignal): Promise<OnlineConfConfig> {
  return request('/onlineconf/admin/configs', { method: 'POST', data, signal });
}

/** @throws {ApiError} */
export function updateOnlineConfConfig(
  key: OnlineConfConfigKey,
  value: OnlineConfJsonValue,
  signal: AbortSignal,
): Promise<OnlineConfConfig> {
  return request(configItemPath(key), { method: 'PATCH', data: { value }, signal });
}
