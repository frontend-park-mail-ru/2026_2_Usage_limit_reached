import { authDispatcher } from '@/modules/auth/auth.dispatcher.ts';
import { authStore } from '@/modules/auth/auth.store.ts';
import type { SessionUser } from '@/modules/auth/auth.types.ts';

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
