import type { PostAttachment } from '@/modules/api/attachments.ts';
import { formatAttachmentSize, getAttachmentUrl } from '@/utils/helpers/attachments.ts';

/** Показывает данные файла и предпросмотр по адресу из ответа загрузки. */
export function showAttachmentPreview(message: HTMLElement, attachment: PostAttachment): void {
  const extension = attachment.name.split('.').pop()?.toUpperCase();
  message.textContent = `${extension} · ${formatAttachmentSize(attachment.size_bytes)}`;
  const url = getAttachmentUrl(attachment.url);
  if (!url) {
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
  media.src = url;
  message.before(media);
}
