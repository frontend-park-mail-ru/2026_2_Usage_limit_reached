import fileTemplate from './postAttachmentFile.hbs';
import type { PostAttachment } from '@/modules/api/attachments.ts';
import { formatAttachmentSize, getAttachmentUrl } from '@/utils/helpers/attachments.ts';

/** Показывает ошибку в том же месте, где было вложение. */
function showUnavailable(figure: HTMLElement, message: string): void {
  figure.classList.remove('post-page__attachment_media');
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
    const name = document.createElement('figcaption');
    name.className = 'post-page__file-name';
    name.textContent = file.name;
    name.title = file.name;

    const size = document.createElement('span');
    size.className = 'post-page__file-size';
    const dot = file.name.lastIndexOf('.');
    const extension = dot > 0 ? file.name.slice(dot + 1).toUpperCase() : '';
    const sizeLabel = formatAttachmentSize(file.size_bytes);
    size.textContent = extension ? `${extension} · ${sizeLabel}` : sizeLabel;

    figure.classList.add('post-page__attachment_media');
    figure.replaceChildren(name, media, size);
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
