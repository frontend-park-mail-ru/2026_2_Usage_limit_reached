import * as profileApi from '@/modules/api/profile.ts';
import type { AuthorCreationInput, Profile, ProfileUpdate } from '@/modules/api/profile.types.ts';
import { getSessionContext, isSessionCurrent, runSessionRequest, runSessionMutation } from '@/modules/auth/auth.actions.ts';
import { saveOfflineProfile } from '@/modules/offline/offline.storage.ts';
import { updateSession } from '@/modules/api/session.ts';
import type { SessionContext } from '@/modules/auth/auth.types.ts';
import type { SavedProfileNavigation } from './profile.types.ts';
import { profileDispatcher } from './profile.dispatcher.ts';
import type { Navigate } from '@/app/paths.ts';
import { ROUTES } from '@/app/paths.ts';

/**
 * Передаёт ответ сохранения через store на время открытия профиля.
 * @param saved
 * @param navigate
 */
export function openSavedProfile(saved: SavedProfileNavigation, navigate: Navigate): void {
  if (!isSessionCurrent(saved.context)) {
    return;
  }
  profileDispatcher.dispatch({ type: 'profile/navigation', saved });
  try {
    navigate(ROUTES.profile);
  } finally {
    profileDispatcher.dispatch({ type: 'profile/navigation', saved: undefined });
  }
}

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
export async function saveProfile(data: ProfileUpdate, context: SessionContext): Promise<SavedProfileNavigation | undefined> {
  const saved = await runSessionMutation(context, () => profileApi.updateProfile(data));
  const current = getSessionContext();
  if (!saved || !current || current.userId !== saved.user.id) {
    return undefined;
  }
  const stored = await saveOfflineProfile(current.offlineToken, saved, () => isSessionCurrent(current));
  if (!isSessionCurrent(current)) {
    return undefined;
  }
  updateSession({ nickname: saved.user.nickname });
  return { profile: stored === null ? undefined : saved, context: current };
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
