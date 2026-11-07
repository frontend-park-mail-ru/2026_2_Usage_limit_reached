import { ApiError, request } from './request.ts';
import type { RequestOptions } from './request.types.ts';
import { expireSession } from '../auth/auth.actions.ts';
import { authDispatcher } from '../auth/auth.dispatcher.ts';
import { authStore } from '../auth/auth.store.ts';
import type { SessionUser } from '../auth/auth.types.ts';

/**
 * Обновляет пользователя в store.
 * @param changes
 */
function updateSession(changes: Partial<SessionUser>): void {
  const { status, user } = authStore.getState();
  if (status === 'authenticated') {
    authDispatcher.dispatch({ type: 'auth/authenticated', user: { ...user, ...changes } });
  }
}

/**
 * Запрос вошедшего пользователя.
 * @param path
 * @param options
 * @param getChanges
 * @throws {ApiError}
 */
export async function sessionRequest<T>(
  path: string,
  options: RequestOptions = {},
  getChanges?: (result: T) => Partial<SessionUser>,
): Promise<T> {
  let result: T;
  try {
    result = await request<T>(path, options);
  } catch (err) {
    if (err instanceof ApiError && err.status === 401) {
      expireSession();
    }
    throw err;
  }
  if (getChanges) {
    updateSession(getChanges(result));
  }
  return result;
}
