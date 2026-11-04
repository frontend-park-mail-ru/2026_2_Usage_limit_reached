import * as profileApi from '../api/profile.ts';
import type { ProfileUpdate } from '../api/profile.types.ts';
import { isSessionCurrent, runSessionRequest } from '../auth/auth.actions.ts';
import { authDispatcher } from '../auth/auth.dispatcher.ts';
import { authStore } from '../auth/auth.store.ts';
import type { SessionContext, SessionUser } from '../auth/auth.types.ts';

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
 * @param context
 * @throws {ApiError}
 */
export async function saveProfile(data: ProfileUpdate, context: SessionContext): Promise<boolean> {
  const saved = await runSessionRequest(context, async () => {
    await profileApi.updateProfile(data);
    return true;
  });
  if (!saved || !isSessionCurrent(context)) {
    return false;
  }
  updateSessionUser({ username: data.user.username, nickname: data.user.nickname });
  return true;
}

/**
 * Загружает аватар.
 * @param file
 * @param context
 * @throws {ApiError}
 */
export async function uploadAvatar(file: Blob, context: SessionContext): Promise<string | undefined> {
  const result = await runSessionRequest(context, () => profileApi.uploadAvatar(file));
  if (!result || !isSessionCurrent(context)) {
    return undefined;
  }
  const { avatar_url } = result;
  updateSessionUser({ avatar_url });
  return avatar_url;
}

/**
 * Удаляет аватар.
 * @param context
 * @throws {ApiError}
 */
export async function deleteAvatar(context: SessionContext): Promise<boolean> {
  const deleted = await runSessionRequest(context, async () => {
    await profileApi.deleteAvatar();
    return true;
  });
  if (!deleted || !isSessionCurrent(context)) {
    return false;
  }
  updateSessionUser({ avatar_url: undefined });
  return true;
}
