import { ActionMenu } from '@/components/actionMenu/actionMenu.ts';
import { uploadAttachment } from '@/modules/api/attachments.ts';
import type { AttachmentType, PostAttachment } from '@/modules/api/attachments.ts';
import { ApiError } from '@/modules/api/request.ts';
import { isSessionCurrent, runSessionRequest } from '@/modules/auth/auth.actions.ts';
import type { SessionContext } from '@/modules/auth/auth.types.ts';
import { requireElement } from '@/utils/helpers/dom.ts';
import { ATTACHMENT_OPTIONS, validateAttachment } from './attachmentValidation.ts';

/** Подключает выбор файла и хранит загруженные вложения до выхода из редактора. */
export function bindAttachments(form: HTMLFormElement, context: SessionContext, signal: AbortSignal): void {
  const picker = requireElement<HTMLElement>(form, '[data-attachments]');
  const add = requireElement<HTMLButtonElement>(picker, '.post-editor__attachment-add');
  const input = requireElement<HTMLInputElement>(picker, 'input[type="file"]');
  const card = requireElement<HTMLElement>(form, '[data-attachment]');
  const name = requireElement<HTMLElement>(card, '[data-attachment-name]');
  const message = requireElement<HTMLElement>(card, '.post-editor__attachment-message');
  const retry = requireElement<HTMLButtonElement>(card, '.post-editor__attachment-retry');
  const uploaded = new Map<string, PostAttachment>();
  let type: AttachmentType = 'image';
  let file: File | undefined;
  let latestId: string | undefined;
  let pending: AbortController | undefined;

  const menu = new ActionMenu(picker, (action) => {
    if (Object.hasOwn(ATTACHMENT_OPTIONS, action) && isSessionCurrent(context)) {
      type = action as AttachmentType;
      input.accept = ATTACHMENT_OPTIONS[type].extensions.join(',');
      input.click();
    }
  });

  const show = (text: string, error = false, canRetry = false) => {
    message.textContent = text;
    message.classList.toggle('post-editor__attachment-message_error', error);
    retry.hidden = !canRetry;
  };

  async function upload(selected: File | undefined): Promise<void> {
    if (!selected || pending || !isSessionCurrent(context)) {
      return;
    }
    const attempt = new AbortController();
    pending = attempt;
    add.disabled = true;
    show('Загружается');
    try {
      const attachment = await runSessionRequest(context, () => uploadAttachment(selected, attempt.signal));
      if (attachment && pending === attempt && !signal.aborted) {
        uploaded.set(attachment.id, attachment);
        latestId = attachment.id;
        file = undefined;
        show('Файл загружен');
      }
    } catch (error) {
      if (pending === attempt && !signal.aborted && isSessionCurrent(context)) {
        const wasVisible = card.getBoundingClientRect().bottom <= window.innerHeight;
        const rejected = error instanceof ApiError && (error.status === 413 || error.status === 415);
        show(rejected ? error.text : 'Не удалось загрузить файл', true, !rejected);
        if (wasVisible) {
          card.scrollIntoView({ block: 'nearest' });
        }
      }
    } finally {
      if (pending === attempt) {
        pending = undefined;
        add.disabled = !isSessionCurrent(context);
      }
    }
  }

  input.addEventListener('change', () => {
    const selected = input.files?.[0];
    if (!selected || pending || !isSessionCurrent(context)) {
      return;
    }
    input.value = '';
    latestId = undefined;
    name.textContent = selected.name;
    card.hidden = false;
    const issue = validateAttachment(selected, type);
    file = issue ? undefined : selected;
    if (issue) {
      const limit = ATTACHMENT_OPTIONS[type].maxMiB;
      show(issue === 'size' ? `Файл слишком большой. Выберите файл размером до ${limit} МиБ`
        : 'Этот формат файла не подходит. Выберите другой', true);
    }
    void upload(file);
    card.scrollIntoView({ block: 'nearest' });
  }, { signal });
  retry.addEventListener('click', () => { void upload(file); }, { signal });
  requireElement(card, '.post-editor__attachment-close').addEventListener('click', () => {
    pending?.abort();
    pending = undefined;
    file = undefined;
    if (latestId) {
      uploaded.delete(latestId);
      latestId = undefined;
    }
    card.hidden = true;
    add.disabled = !isSessionCurrent(context);
    add.focus();
  }, { signal });
  signal.addEventListener('abort', () => {
    menu.destroy();
    pending?.abort();
  }, { once: true });
}
