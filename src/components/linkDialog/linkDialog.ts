import { Modal } from '../modal/modal.ts';
import { requireElement } from '../../utils/helpers/dom.ts';
import { validate } from '../../modules/validation/validate.ts';
import { linkSchema } from '../../modules/validation/schemas.ts';
import { setFieldError, showErrors } from '../../modules/validation/bindForm.ts';
import { normalizeUrl } from '../../modules/sanitize/sanitize.ts';
import type { LinkInsert } from './linkDialog.types.ts';

/** Окно «Добавить ссылку». */
export class LinkDialog {
  private readonly modal: Modal;
  private readonly form: HTMLFormElement;
  private readonly textInput: HTMLInputElement;
  private readonly urlInput: HTMLInputElement;
  private readonly submitButton: HTMLButtonElement;
  private readonly onInput: (event: Event) => void;
  private readonly onSubmit: (event: SubmitEvent) => void;
  private onInsert: LinkInsert | null = null;

  /**
   * @param dialog
   */
  constructor(dialog: HTMLDialogElement) {
    this.modal = new Modal(dialog, () => {
      this.onInsert = null;
    });
    this.form = requireElement<HTMLFormElement>(dialog, '.link-dialog__form');
    this.textInput = requireElement<HTMLInputElement>(this.form, '[name="text"]');
    this.urlInput = requireElement<HTMLInputElement>(this.form, '[name="url"]');
    this.submitButton = requireElement<HTMLButtonElement>(this.form, '[type="submit"]');
    this.onInput = this.handleInput.bind(this);
    this.onSubmit = this.handleSubmit.bind(this);
    this.form.addEventListener('input', this.onInput);
    this.form.addEventListener('submit', this.onSubmit);
  }

  /**
   * Открывает пустое окно с подставленным текстом.
   * @param text
   * @param onInsert
   */
  open(text: string, onInsert: LinkInsert): void {
    this.onInsert = onInsert;
    this.form.reset();
    this.textInput.value = text.trim();
    setFieldError(this.form, 'text', null);
    setFieldError(this.form, 'url', null);
    this.updateSubmit();
    this.modal.open();
    (this.textInput.value ? this.urlInput : this.textInput).focus();
  }

  /** Снимает обработчики. */
  destroy(): void {
    this.form.removeEventListener('input', this.onInput);
    this.form.removeEventListener('submit', this.onSubmit);
    this.modal.destroy();
  }

  /** Кнопка активна, когда оба поля заполнены. */
  private updateSubmit(): void {
    this.submitButton.disabled = !this.textInput.value.trim() || !this.urlInput.value.trim();
  }

  /**
   * Убирает ошибку поля при вводе.
   * @param event
   */
  private handleInput(event: Event): void {
    if (event.target instanceof HTMLInputElement) {
      setFieldError(this.form, event.target.name, null);
    }
    this.updateSubmit();
  }

  /**
   * Проверяет поля и вставляет ссылку.
   * @param event
   */
  private handleSubmit(event: SubmitEvent): void {
    event.preventDefault();
    const values = { text: this.textInput.value, url: this.urlInput.value };
    const { isValid, errors } = validate(values, linkSchema);
    const href = normalizeUrl(values.url);
    if (!isValid || !href) {
      showErrors(this.form, errors);
      this.form.querySelector<HTMLElement>('[aria-invalid="true"]')?.focus();
      return;
    }
    const insert = this.onInsert;
    this.modal.close();
    insert?.(values.text.trim(), href);
  }
}
