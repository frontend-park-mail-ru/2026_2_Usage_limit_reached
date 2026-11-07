import { ApiError } from './request.ts';
import { expireSession } from '../auth/auth.actions.ts';
import { authDispatcher } from '../auth/auth.dispatcher.ts';
import { authStore } from '../auth/auth.store.ts';
import type { SessionUser } from '../auth/auth.types.ts';

/**
 * Запрос с выходом в гостя при 401.
 * @param request
 * @throws {ApiError}
 */
export async function withSession<T>(request: () => Promise<T>): Promise<T> {
  try {
    return await request();
  } catch (err) {
    if (err instanceof ApiError && err.status === 401) {
      expireSession();
    }
    throw err;
  }
}

/**
 * Обновляет пользователя в store.
 * @param changes
 */
export function updateSession(changes: Partial<SessionUser>): void {
  const { status, user } = authStore.getState();
  if (status === 'authenticated') {
    authDispatcher.dispatch({ type: 'auth/authenticated', user: { ...user, ...changes } });
  }
}
