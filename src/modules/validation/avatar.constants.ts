export const AVATAR_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

export const AVATAR_MAX_BYTES = 5 * 1024 * 1024;
export const AVATAR_MAX_SIDE = 4096;

export const AVATAR_ERROR = 'Выберите JPG, PNG или WebP размером не больше 5 МБ';
export const AVATAR_DIMENSIONS_ERROR = `Выберите изображение размером не больше ${AVATAR_MAX_SIDE} × ${AVATAR_MAX_SIDE} пикселей`;
export const AVATAR_INVALID_IMAGE = 'Не удалось открыть фото. Выберите другой файл';
