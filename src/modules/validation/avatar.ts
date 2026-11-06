import { AVATAR_ERROR, AVATAR_MAX_BYTES, AVATAR_TYPES } from './avatar.constants.ts';

/**
 * Проверяет файл аватара.
 * @param file
 */
export const validateAvatar = (file: File): string | null =>
  (AVATAR_TYPES.includes(file.type) && file.size <= AVATAR_MAX_BYTES ? null : AVATAR_ERROR);
