import type { PostAttachment } from '@/modules/api/attachments.ts';

const SIZE_UNITS = ['Б', 'КБ', 'МБ', 'ГБ'];
const sizeFormat = new Intl.NumberFormat('ru-RU', { maximumFractionDigits: 1 });

/** Показывает данные файла и предпросмотр по адресу из ответа загрузки. */
export function showAttachmentPreview(message: HTMLElement, attachment: PostAttachment): void {
  let size = attachment.size_bytes;
  let unit = 0;
  while (size >= 1024 && unit < SIZE_UNITS.length - 1) {
    size /= 1024;
    unit += 1;
  }
  const extension = attachment.name.split('.').pop()?.toUpperCase();
  message.textContent = `${extension} · ${sizeFormat.format(size)} ${SIZE_UNITS[unit]}`;
  if (!attachment.url.startsWith('/api/attachments/')) {
    return;
  }

  let media: HTMLImageElement | HTMLMediaElement;
  if (attachment.media_type === 'image') {
    media = document.createElement('img');
    media.alt = '';
  } else if (attachment.media_type === 'video' || attachment.media_type === 'audio') {
    media = document.createElement(attachment.media_type);
    media.controls = true;
    media.preload = 'metadata';
    media.setAttribute('aria-label', attachment.name);
  } else {
    return;
  }
  media.className = 'post-editor__attachment-preview';
  media.src = attachment.url;
  message.before(media);
}
