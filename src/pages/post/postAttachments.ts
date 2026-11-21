import fileTemplate from './postAttachmentFile.hbs';
import type { PostAttachment } from '@/modules/api/attachments.ts';
import { formatAttachmentSize, getAttachmentUrl } from '@/utils/helpers/attachments.ts';
import { requireElement } from '@/utils/helpers/dom.ts';

/** Показывает ошибку в том же месте, где было вложение. */
function showUnavailable(figure: HTMLElement, message: string): void {
  figure.classList.add('post-page__attachment_unavailable');
  const status = document.createElement('span');
  status.setAttribute('role', 'status');
  status.textContent = message;
  figure.replaceChildren(status);
}

/** Скачивает документ после клика, оставляя повтор доступным при ошибке. */
function bindDownload(figure: HTMLElement, file: PostAttachment, url: string, signal: AbortSignal): void {
  figure.classList.add('post-page__attachment_file');
  figure.innerHTML = fileTemplate({ name: file.name, size: formatAttachmentSize(file.size_bytes) });
  const button = requireElement<HTMLButtonElement>(figure, '.post-page__download');
  const error = requireElement(figure, '[data-download-error]');

  button.addEventListener('click', async () => {
    button.disabled = true;
    error.textContent = '';
    try {
      const response = await fetch(url, { signal, cache: 'no-store', mode: 'same-origin' });
      if (!response.ok) {
        throw new Error();
      }
      const blob = await response.blob();
      if (signal.aborted) {
        return;
      }
      const link = document.createElement('a');
      const blobUrl = URL.createObjectURL(blob);
      link.href = blobUrl;
      link.download = file.name;
      link.click();
      window.setTimeout(() => URL.revokeObjectURL(blobUrl), 1000);
    } catch {
      if (!signal.aborted) {
        error.textContent = 'Не удалось скачать файл';
      }
    } finally {
      button.disabled = false;
    }
  }, { signal });
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
      bindDownload(figure, file, url, signal);
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
