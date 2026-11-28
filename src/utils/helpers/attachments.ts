const SIZE_UNITS = ['Б', 'КБ', 'МБ', 'ГБ'];
const sizeFormat = new Intl.NumberFormat('ru-RU', { maximumFractionDigits: 1 });

/** Форматирует размер файла для карточки вложения. */
export function formatAttachmentSize(bytes: number): string {
  let size = bytes;
  let unit = 0;
  while (size >= 1024 && unit < SIZE_UNITS.length - 1) {
    size /= 1024;
    unit += 1;
  }
  return `${sizeFormat.format(size)} ${SIZE_UNITS[unit]}`;
}

/** Разрешает адрес файла только на текущем origin и внутри API вложений. */
export function getAttachmentUrl(value: string): string | null {
  try {
    const url = new URL(value, window.location.origin);
    return url.origin === window.location.origin && !url.username && !url.password
      && url.pathname.startsWith('/api/attachments/') ? url.href : null;
  } catch {
    return null;
  }
}
