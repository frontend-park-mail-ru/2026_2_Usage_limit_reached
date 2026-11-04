/** Всплывающее окно на основе dialog. */
export class Modal {
  private readonly dialog: HTMLDialogElement;
  private readonly onClick: (event: MouseEvent) => void;
  private readonly onClose: () => void;

  /**
   * @param dialog
   * @param onClose
   */
  constructor(dialog: HTMLDialogElement, onClose: () => void = () => {}) {
    this.dialog = dialog;
    this.onClick = this.handleClick.bind(this);
    this.onClose = onClose;
    this.dialog.addEventListener('click', this.onClick);
    this.dialog.addEventListener('close', this.onClose);
  }

  /** Открывает окно. */
  open(): void {
    if (!this.dialog.open) {
      this.dialog.showModal();
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
    if (target === this.dialog || (target instanceof Element && target.closest('[data-modal-close]'))) {
      this.close();
    }
  }

  /** Снимает обработчики. */
  destroy(): void {
    this.close();
    this.dialog.removeEventListener('click', this.onClick);
    this.dialog.removeEventListener('close', this.onClose);
  }
}
