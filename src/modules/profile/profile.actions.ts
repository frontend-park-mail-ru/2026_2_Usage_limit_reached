import * as profileApi from '../api/profile.ts';
import type { ProfileUpdate } from '../api/profile.types.ts';
import { ApiError } from '../api/request.ts';
import { expireSession } from '../auth/auth.actions.ts';
import { authDispatcher } from '../auth/auth.dispatcher.ts';
import { authStore } from '../auth/auth.store.ts';
import type { SessionUser } from '../auth/auth.types.ts';

/**
 * Запрос с выходом в гостя при 401.
 * @param request
 * @throws {ApiError}
 */
async function withSession<T>(request: () => Promise<T>): Promise<T> {
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
function updateSessionUser(changes: Partial<SessionUser>): void {
  const { status, user } = authStore.getState();
  if (status === 'authenticated') {
    authDispatcher.dispatch({ type: 'auth/authenticated', user: { ...user, ...changes } });
  }
}

/**
 * Сохраняет профиль.
 * @param data
 * @throws {ApiError}
 */
export async function saveProfile(data: ProfileUpdate): Promise<void> {
  await withSession(() => profileApi.updateProfile(data));
  updateSessionUser({ username: data.user.username, nickname: data.user.nickname });
}

/**
 * Загружает аватар.
 * @param file
 * @throws {ApiError}
 */
export async function uploadAvatar(file: Blob): Promise<string> {
  const { avatar_url } = await withSession(() => profileApi.uploadAvatar(file));
  updateSessionUser({ avatar_url });
  return avatar_url;
}

/**
 * Удаляет аватар.
 * @throws {ApiError}
 */
export async function deleteAvatar(): Promise<void> {
  await withSession(profileApi.deleteAvatar);
  updateSessionUser({ avatar_url: undefined });
}
