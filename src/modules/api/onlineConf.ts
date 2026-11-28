import { ApiError } from './apiError.ts';
import { sendRequest } from './http.ts';
import { request } from './request.ts';
import type {
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

/** Создаёт флаг в выбранном скоупе. */
export const createOnlineConfFlag = (data: { scope: string; name: string; rollout_percent: number }, signal: AbortSignal) =>
  request<void>('/onlineconf/admin/flags', { method: 'POST', data, signal, responseType: 'empty' });

/** Обновляет процент раскатки флага. */
export const updateOnlineConfFlagRollout = (id: string, rollout_percent: number, signal: AbortSignal) =>
  request<void>(`/onlineconf/admin/flags/${encodeURIComponent(id)}`, {
    method: 'PATCH', data: { rollout_percent }, signal, responseType: 'empty',
  });
