import * as profileApi from '@/modules/api/profile.ts';
import type { ProfileUpdate } from '@/modules/api/profile.types.ts';
import { isSessionCurrent, runSessionRequest, runSessionMutation } from '@/modules/auth/auth.actions.ts';
import { updateSession } from '@/modules/api/session.ts';
import type { SessionContext } from '@/modules/auth/auth.types.ts';

/**
 * Сохраняет профиль.
 * @param data
 * @param context
 * @throws {ApiError}
 */
export async function saveProfile(data: ProfileUpdate, context: SessionContext): Promise<boolean> {
  const saved = await runSessionMutation(context, async () => {
    await profileApi.updateProfile(data);
    return true;
  });
  if (!saved) {
    return false;
  }
  updateSession({ username: data.user.username, nickname: data.user.nickname });
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
  updateSession({ avatar_url });
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
  updateSession({ avatar_url: undefined });
  return true;
}
