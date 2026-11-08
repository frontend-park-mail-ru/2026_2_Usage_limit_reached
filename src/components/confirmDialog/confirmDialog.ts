import { Modal } from '@/components/modal/modal.ts';
import { requireElement } from '@/utils/helpers/dom.ts';
import { setAlert } from '@/components/alert/alert.ts';
import { CONFIRM_ERROR_FALLBACK } from './confirmDialog.constants.ts';
import type { ConfirmAction } from './confirmDialog.types.ts';

/** Окно подтверждения действия с показом ошибки. */
export class ConfirmDialog {
  private readonly modal: Modal;
  private readonly error: HTMLElement;
  private readonly subject: HTMLElement | null;
  private readonly buttons: HTMLButtonElement[];
  private readonly labels: string[];
  private readonly submitButton: HTMLButtonElement;
  private readonly onSubmit: () => void;
  private readonly dismissButtons: HTMLButtonElement[];
  private action: ConfirmAction | null = null;

  /**
   * @param dialog
   * @param lockWhilePending
   */
  constructor(dialog: HTMLDialogElement, lockWhilePending = false) {
    this.error = requireElement<HTMLElement>(dialog, '.confirm-dialog__error');
    this.subject = dialog.querySelector('[data-confirm-subject]');
    this.submitButton = requireElement<HTMLButtonElement>(dialog, '[data-confirm-submit]');
    this.dismissButtons = lockWhilePending ? [...dialog.querySelectorAll<HTMLButtonElement>('[data-modal-close]')] : [];
    this.modal = new Modal(dialog, () => {
      if (!dialog.open) {
        this.action = null;
      }
    }, () => !lockWhilePending || !this.submitButton.disabled);
    this.buttons = [...dialog.querySelectorAll<HTMLButtonElement>('.confirm-dialog__actions .button')];
    this.labels = this.buttons.map((button) => button.textContent ?? '');
    this.onSubmit = () => {
      void this.submit();
    };
    this.submitButton.addEventListener('click', this.onSubmit);
  }

  /**
   * Открывает окно для объекта с названием subject.
   * @param subject
   * @param action
   */
  open(subject: string | null, action: ConfirmAction): void {
    this.action = action;
    if (this.subject) {
      this.subject.textContent = subject === null ? '' : `«${subject}»`;
    }
    this.setError(null);
    this.modal.open();
  }

  /** Закрывает окно и отвязывает подтверждение от страницы. */
  close(): void {
    this.action = null;
    this.modal.close();
  }

  /** Снимает обработчики. */
  destroy(): void {
    this.action = null;
    this.submitButton.removeEventListener('click', this.onSubmit);
    this.modal.destroy();
  }

  /**
   * Показывает ошибку и меняет подписи кнопок.
   * @param text
   */
  private setError(text: string | null): void {
    setAlert(this.error, text);
    this.buttons.forEach((button, index) => {
      button.textContent = (text && button.dataset.errorLabel) || this.labels[index];
    });
  }

  /** Выполняет действие и закрывает окно при успехе. */
  private async submit(): Promise<void> {
    const action = this.action;
    if (!action || this.submitButton.disabled) {
      return;
    }
    this.submitButton.disabled = true;
    for (const button of this.dismissButtons) {
      button.disabled = true;
    }
    let error: string | null;
    try {
      error = await action();
    } catch {
      error = CONFIRM_ERROR_FALLBACK;
    }
    this.submitButton.disabled = false;
    for (const button of this.dismissButtons) {
      button.disabled = false;
    }
    if (this.action !== action) {
      return;
    }
    if (error) {
      this.setError(error);
    } else {
      this.close();
    }
  }
}
