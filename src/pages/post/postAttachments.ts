import fileTemplate from './postAttachmentFile.hbs';
import type { PostAttachment } from '@/modules/api/attachments.ts';
import { formatAttachmentSize, getAttachmentUrl } from '@/utils/helpers/attachments.ts';

/** Показывает ошибку в том же месте, где было вложение. */
function showUnavailable(figure: HTMLElement, message: string): void {
  figure.classList.add('post-page__attachment_unavailable');
  const status = document.createElement('span');
  status.setAttribute('role', 'status');
  status.textContent = message;
  figure.replaceChildren(status);
}

/** Подставляет вложения в очищенный текст по ID маркеров. */
export function bindPostAttachments(body: Element, attachments: PostAttachment[]): () => void {
  const controller = new AbortController();
  const { signal } = controller;
  const byId = new Map(attachments.map((file) => [file.id, file]));
  for (const figure of body.querySelectorAll<HTMLElement>('figure[data-attachment-id]')) {
    const file = byId.get(figure.dataset.attachmentId ?? '');
    const url = file && getAttachmentUrl(file.url);
    figure.classList.add('post-page__attachment');
    if (!file || !url) {
      showUnavailable(figure, 'Вложение недоступно');
      continue;
    }
    if (file.media_type === 'file') {
      figure.classList.add('post-page__attachment_file');
      figure.innerHTML = fileTemplate({ name: file.name, size: formatAttachmentSize(file.size_bytes), url });
      continue;
    }

    let media: HTMLImageElement | HTMLMediaElement;
    if (file.media_type === 'image') {
      media = document.createElement('img');
      media.alt = file.name;
    } else if (file.media_type === 'video' || file.media_type === 'audio') {
      media = document.createElement(file.media_type);
      media.controls = true;
      media.preload = 'metadata';
      media.setAttribute('aria-label', file.name);
      if (media instanceof HTMLVideoElement) {
        media.playsInline = true;
      }
    } else {
      showUnavailable(figure, 'Вложение недоступно');
      continue;
    }
    media.addEventListener('error', () => showUnavailable(figure, 'Не удалось открыть вложение'), { once: true, signal });
    media.src = url;
    figure.append(media);
  }

  return () => {
    controller.abort();
    body.querySelectorAll<HTMLMediaElement>('audio, video').forEach((media) => {
      media.pause();
      media.removeAttribute('src');
      media.load();
    });
  };
}
