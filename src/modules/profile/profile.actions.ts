import * as profileApi from '../api/profile.ts';
import type { ProfileUpdate } from '../api/profile.types.ts';
import { updateSession, withSession } from '../api/session.ts';

/**
 * Сохраняет профиль.
 * @param data
 * @throws {ApiError}
 */
export async function saveProfile(data: ProfileUpdate): Promise<void> {
  await withSession(() => profileApi.updateProfile(data));
  updateSession({ username: data.user.username, nickname: data.user.nickname });
}

/**
 * Загружает аватар.
 * @param file
 * @throws {ApiError}
 */
export async function uploadAvatar(file: Blob): Promise<string> {
  const { avatar_url } = await withSession(() => profileApi.uploadAvatar(file));
  updateSession({ avatar_url });
  return avatar_url;
}

/**
 * Удаляет аватар.
 * @throws {ApiError}
 */
export async function deleteAvatar(): Promise<void> {
  await withSession(profileApi.deleteAvatar);
  updateSession({ avatar_url: undefined });
}
