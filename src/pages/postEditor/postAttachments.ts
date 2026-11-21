import { ActionMenu } from '@/components/actionMenu/actionMenu.ts';
import type { RichEditor } from '@/components/richEditor/richEditor.ts';
import { uploadAttachment } from '@/modules/api/attachments.ts';
import type { AttachmentType, PostAttachment } from '@/modules/api/attachments.ts';
import { ApiError } from '@/modules/api/request.ts';
import { isSessionCurrent, runSessionRequest } from '@/modules/auth/auth.actions.ts';
import type { SessionContext } from '@/modules/auth/auth.types.ts';
import { requireElement } from '@/utils/helpers/dom.ts';
import { ATTACHMENT_OPTIONS, validateAttachment } from './attachmentValidation.ts';
import { showAttachmentPreview } from './attachmentPreview.ts';

/** Подключает выбор файла и хранит загруженные вложения до выхода из редактора. */
export function bindAttachments(form: HTMLFormElement, editor: RichEditor, context: SessionContext, signal: AbortSignal): void {
  const picker = requireElement<HTMLElement>(form, '[data-attachments]');
  const add = requireElement<HTMLButtonElement>(picker, '.post-editor__attachment-add');
  const input = requireElement<HTMLInputElement>(picker, 'input[type="file"]');
  const template = requireElement<HTMLTemplateElement>(form, '[data-attachment-template]');
  const cardTemplate = requireElement<HTMLElement>(template.content, '[data-attachment]');
  const uploaded = new WeakMap<HTMLElement, PostAttachment>();
  let before: ChildNode | null = null;
  let type: AttachmentType = 'image';

  const rememberPosition = () => {
    if (add.getAttribute('aria-expanded') === 'false') {
      before = editor.getAttachmentPosition();
    }
  };
  add.addEventListener('pointerdown', rememberPosition, { signal });
  add.addEventListener('click', (event) => {
    if (event.detail === 0) {
      rememberPosition();
    }
  }, { capture: true, signal });
  const menu = new ActionMenu(picker, (action) => {
    if (Object.hasOwn(ATTACHMENT_OPTIONS, action) && isSessionCurrent(context)) {
      type = action as AttachmentType;
      input.accept = ATTACHMENT_OPTIONS[type].extensions.join(',');
      input.click();
    }
  });

  input.addEventListener('change', () => {
    const selected = input.files?.[0];
    if (!selected || !isSessionCurrent(context)) {
      return;
    }
    input.value = '';
    const card = cardTemplate.cloneNode(true) as HTMLElement;
    const name = requireElement<HTMLElement>(card, '[data-attachment-name]');
    const message = requireElement<HTMLElement>(card, '.post-editor__attachment-message');
    const retry = requireElement<HTMLButtonElement>(card, '.post-editor__attachment-retry');
    name.textContent = selected.name;
    editor.insertAttachment(card, before);
    const issue = validateAttachment(selected, type);
    let file = issue ? undefined : selected;
    let pending: AbortController | undefined;

    const show = (text: string, error = false, canRetry = false) => {
      message.textContent = text;
      message.classList.toggle('post-editor__attachment-message_error', error);
      retry.hidden = !canRetry;
    };

    async function upload(selectedFile: File | undefined): Promise<void> {
      if (!selectedFile || pending || !isSessionCurrent(context)) {
        return;
      }
      const attempt = new AbortController();
      pending = attempt;
      const uploadSignal = AbortSignal.any([signal, attempt.signal]);
      show('Загружается');
      try {
        const attachment = await runSessionRequest(context, () => uploadAttachment(selectedFile, uploadSignal));
        if (attachment && card.isConnected && !uploadSignal.aborted) {
          uploaded.set(card, attachment);
          file = undefined;
          name.textContent = attachment.name;
          showAttachmentPreview(message, attachment);
        }
      } catch (error) {
        if (card.isConnected && !uploadSignal.aborted && isSessionCurrent(context)) {
          const wasVisible = card.getBoundingClientRect().bottom <= window.innerHeight;
          const rejected = error instanceof ApiError && (error.status === 413 || error.status === 415);
          show(rejected ? error.text : 'Не удалось загрузить файл', true, !rejected);
          if (wasVisible) {
            card.scrollIntoView({ block: 'nearest' });
          }
        }
      } finally {
        pending = undefined;
      }
    }

    retry.addEventListener('click', () => { void upload(file); });
    requireElement(card, '.post-editor__attachment-close').addEventListener('click', () => {
      pending?.abort();
      uploaded.delete(card);
      editor.removeAttachment(card);
      add.focus();
    });
    if (issue) {
      const limit = ATTACHMENT_OPTIONS[type].maxMiB;
      show(issue === 'size' ? `Файл слишком большой. Выберите файл размером до ${limit} МиБ`
        : 'Этот формат файла не подходит. Выберите другой', true);
    }
    void upload(file);
    card.scrollIntoView({ block: 'nearest' });
  }, { signal });
  signal.addEventListener('abort', () => menu.destroy(), { once: true });
}
