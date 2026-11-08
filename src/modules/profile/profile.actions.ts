import * as profileApi from '../api/profile.ts';
import type { ProfileUpdate } from '../api/profile.types.ts';

/**
 * Сохраняет профиль.
 * @param data
 * @throws {ApiError}
 */
export async function saveProfile(data: ProfileUpdate): Promise<void> {
  await profileApi.updateProfile(data);
}

/**
 * Загружает аватар.
 * @param file
 * @throws {ApiError}
 */
export async function uploadAvatar(file: Blob): Promise<string> {
  const { avatar_url } = await profileApi.uploadAvatar(file);
  return avatar_url;
}

/**
 * Удаляет аватар.
 * @throws {ApiError}
 */
export async function deleteAvatar(): Promise<void> {
  await profileApi.deleteAvatar();
}
