/** Всплывающее окно на основе dialog. */
export class Modal {
  private readonly dialog: HTMLDialogElement;
  private readonly onClick: (event: MouseEvent) => void;
  private readonly onCancel: (event: Event) => void;
  private readonly onClose: () => void;

  /**
   * @param dialog
   * @param onClose
   * @param canDismiss
   */
  constructor(dialog: HTMLDialogElement, onClose: () => void = () => {}, private readonly canDismiss: () => boolean = () => true) {
    this.dialog = dialog;
    this.onClick = this.handleClick.bind(this);
    this.onClose = onClose;
    this.onCancel = (event) => {
      if (!this.canDismiss()) {
        event.preventDefault();
      }
    };
    this.dialog.addEventListener('click', this.onClick);
    this.dialog.addEventListener('cancel', this.onCancel);
    this.dialog.addEventListener('close', this.onClose);
  }

  /** Открывает окно. */
  open(): void {
    if (!this.dialog.open) {
      this.dialog.showModal();
      this.dialog.focus();
    }
  }

  /** Закрывает окно. */
  close(): void {
    this.dialog.close();
  }

  /**
   * Закрывает по крестику и по фону.
   * @param event
   */
  private handleClick(event: MouseEvent): void {
    const target = event.target;
    if (this.canDismiss() && (target === this.dialog || (target instanceof Element && target.closest('[data-modal-close]')))) {
      this.close();
    }
  }

  /** Снимает обработчики. */
  destroy(): void {
    this.close();
    this.dialog.removeEventListener('click', this.onClick);
    this.dialog.removeEventListener('cancel', this.onCancel);
    this.dialog.removeEventListener('close', this.onClose);
  }
}
