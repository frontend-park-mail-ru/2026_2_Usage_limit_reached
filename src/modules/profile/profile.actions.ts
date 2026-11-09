import * as profileApi from '@/modules/api/profile.ts';
import type { AuthorCreationInput, Profile, ProfileUpdate } from '@/modules/api/profile.types.ts';
import { getSessionContext, isSessionCurrent, runSessionRequest, runSessionMutation } from '@/modules/auth/auth.actions.ts';
import { saveOfflineProfile } from '@/modules/offline/offline.storage.ts';
import { updateSession } from '@/modules/api/session.ts';
import type { SessionContext } from '@/modules/auth/auth.types.ts';

/** Создаёт профиль автора и отзывает устаревшую offline-копию. */
export async function becomeAuthor(data: AuthorCreationInput, context: SessionContext): Promise<Profile | undefined> {
  return runSessionMutation(context, () => profileApi.createAuthor(data));
}

/**
 * Сохраняет профиль.
 * @param data
 * @param context
 * @throws {ApiError}
 */
export async function saveProfile(data: ProfileUpdate, context: SessionContext) {
  const saved = await runSessionMutation(context, () => profileApi.updateProfile(data));
  const current = getSessionContext();
  if (!saved || !current || current.userId !== saved.user.id) {
    return undefined;
  }
  const stored = await saveOfflineProfile(current.offlineToken, saved, () => isSessionCurrent(current));
  if (stored === null || !isSessionCurrent(current)) {
    return undefined;
  }
  updateSession({ nickname: saved.user.nickname });
  return { profile: saved, context: current };
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
