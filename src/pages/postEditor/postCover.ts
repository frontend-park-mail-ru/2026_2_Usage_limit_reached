import { uploadAttachment } from '@/modules/api/attachments.ts';
import { isSessionCurrent, runSessionRequest } from '@/modules/auth/auth.actions.ts';
import type { SessionContext } from '@/modules/auth/auth.types.ts';
import { getAttachmentUrl } from '@/utils/helpers/attachments.ts';
import { requireElement } from '@/utils/helpers/dom.ts';
import { ATTACHMENT_OPTIONS, validateAttachment } from './attachmentValidation.ts';

const COVER_PREVIEW_TIMEOUT_MS = 10_000;

/** Хранит выбор обложки отдельно от вложений в тексте. */
export function bindPostCover(
  form: HTMLFormElement,
  originalUrl: string | null,
  context: SessionContext,
  signal: AbortSignal,
  onChange: () => void,
) {
  const block = requireElement(form, '[data-cover]');
  const input = requireElement<HTMLInputElement>(block, 'input[type="file"]');
  const choose = requireElement<HTMLButtonElement>(block, '[data-cover-choose]');
  const remove = requireElement<HTMLButtonElement>(block, '[data-cover-remove]');
  let preview = requireElement<HTMLImageElement>(block, '[data-cover-preview]');
  const status = requireElement<HTMLElement>(block, '[data-cover-status]');
  const { extensions, maxMiB } = ATTACHMENT_OPTIONS.image;
  input.accept = extensions.join(',');
  let savedUrl = originalUrl;
  let url = originalUrl;
  let coverId: string | null | undefined;
  let uploading = false;

  const render = () => {
    const src = url && getAttachmentUrl(url);
    if (src && preview.src !== src) {
      preview.src = src;
      preview.hidden = false;
    } else if (!src) {
      preview.removeAttribute('src');
      preview.hidden = true;
    }
    choose.textContent = url ? 'Изменить обложку' : 'Добавить обложку';
    choose.disabled = uploading;
    remove.hidden = !url;
    remove.disabled = uploading;
  };

  const showStatus = (message: string, error = false) => {
    status.textContent = message;
    status.classList.toggle('post-cover__status_error', error);
  };

  preview.addEventListener('error', (event) => {
    if (event.currentTarget === preview && url) {
      preview.hidden = true;
      if (!status.textContent) {
        showStatus('Не удалось открыть обложку', true);
      }
    }
  }, { signal });

  choose.addEventListener('click', () => input.click(), { signal });
  remove.addEventListener('click', () => {
    url = null;
    coverId = savedUrl ? null : undefined;
    showStatus('');
    render();
    choose.focus();
    onChange();
  }, { signal });

  async function upload(file: File): Promise<void> {
    const issue = validateAttachment(file, 'image');
    if (issue) {
      showStatus(issue === 'size' ? `Выберите изображение размером до ${maxMiB} МиБ`
        : 'Выберите изображение в формате JPEG, PNG или WebP', true);
      return;
    }

    uploading = true;
    showStatus('Обложка загружается');
    render();
    onChange();
    try {
      const attachment = await runSessionRequest(context, () => uploadAttachment(file, signal));
      if (!attachment || signal.aborted || !isSessionCurrent(context)) {
        return;
      }
      const src = getAttachmentUrl(attachment.url);
      if (src) {
        const candidate = preview.cloneNode(false) as HTMLImageElement;
        let cancelPreview!: () => void;
        const cancelled = new Promise<false>((resolve) => {
          cancelPreview = () => resolve(false);
        });
        signal.addEventListener('abort', cancelPreview, { once: true });
        const timeout = window.setTimeout(cancelPreview, COVER_PREVIEW_TIMEOUT_MS);
        candidate.src = src;
        const decoded = await Promise.race([candidate.decode().then(() => true, () => false), cancelled]);
        window.clearTimeout(timeout);
        signal.removeEventListener('abort', cancelPreview);
        if (signal.aborted || !isSessionCurrent(context)) {
          candidate.removeAttribute('src');
          return;
        }
        if (decoded) {
          candidate.hidden = false;
          preview.replaceWith(candidate);
          preview = candidate;
          coverId = attachment.id;
          url = attachment.url;
          showStatus('');
          return;
        }
        candidate.removeAttribute('src');
      }
      showStatus('Не удалось открыть обложку. Выберите изображение ещё раз', true);
    } catch {
      if (!signal.aborted && isSessionCurrent(context)) {
        showStatus('Не удалось загрузить обложку. Выберите изображение ещё раз', true);
      }
    } finally {
      uploading = false;
      if (!signal.aborted) {
        render();
        onChange();
      }
    }
  }

  input.addEventListener('change', () => {
    const file = input.files?.[0];
    input.value = '';
    if (file && !uploading && !form.inert && isSessionCurrent(context)) {
      void upload(file);
    }
  }, { signal });
  render();
  if (originalUrl && !getAttachmentUrl(originalUrl)) {
    showStatus('Не удалось открыть обложку', true);
  }

  return {
    getCoverId: () => coverId,
    hasChanges: () => uploading || coverId !== undefined,
    isUploading: () => uploading,
    markSaved: () => {
      savedUrl = url;
      coverId = undefined;
    },
    reveal: () => block.scrollIntoView({ block: 'nearest' }),
  };
}
