/** Всплывающее окно на основе dialog. */
export class Modal {
  private readonly dialog: HTMLDialogElement;
  private readonly onClick: (event: MouseEvent) => void;
  private readonly onCancel: (event: Event) => void;
  private readonly onClose: () => void;
  private readonly onPointerDown: (event: PointerEvent) => void;
  private readonly onPointerUp: (event: PointerEvent) => void;
  private backdropPointer: number | null = null;
  private backdropClick = false;

  /**
   * @param dialog
   * @param onClose
   * @param canDismiss
   */
  constructor(dialog: HTMLDialogElement, onClose: () => void = () => {}, private readonly canDismiss: () => boolean = () => true) {
    this.dialog = dialog;
    this.onClick = this.handleClick.bind(this);
    this.onClose = onClose;
    this.onPointerDown = (event) => {
      this.backdropClick = false;
      this.backdropPointer = event.type === 'pointerdown' && this.isBackdrop(event) && event.isPrimary && event.button === 0
        ? event.pointerId : null;
    };
    this.onPointerUp = (event) => {
      this.backdropClick = this.isBackdrop(event) && event.pointerId === this.backdropPointer;
      this.backdropPointer = null;
    };
    this.onCancel = (event) => {
      if (!this.canDismiss()) {
        event.preventDefault();
      }
    };
    this.dialog.addEventListener('click', this.onClick);
    this.dialog.addEventListener('pointerdown', this.onPointerDown);
    this.dialog.addEventListener('pointerup', this.onPointerUp);
    this.dialog.addEventListener('pointercancel', this.onPointerDown);
    this.dialog.addEventListener('cancel', this.onCancel);
    this.dialog.addEventListener('close', this.onClose);
  }

  /** Открывает окно. */
  open(): void {
    this.backdropClick = false;
    this.backdropPointer = null;
    if (!this.dialog.open) {
      this.dialog.showModal();
      this.dialog.focus();
    }
  }

  /** Закрывает окно. */
  close(): void {
    this.dialog.close();
  }

  /** Проверяет, что указатель находится на фоне за пределами окна. */
  private isBackdrop(event: PointerEvent): boolean {
    const rect = this.dialog.getBoundingClientRect();
    return event.target === this.dialog
      && (event.clientX < rect.left || event.clientX > rect.right
        || event.clientY < rect.top || event.clientY > rect.bottom);
  }

  /**
   * Закрывает по крестику и по фону.
   * @param event
   */
  private handleClick(event: MouseEvent): void {
    const target = event.target;
    const backdrop = target === this.dialog && this.backdropClick;
    this.backdropClick = false;
    if (this.canDismiss() && (backdrop || (target instanceof Element && target.closest('[data-modal-close]')))) {
      this.close();
    }
  }

  /** Снимает обработчики. */
  destroy(): void {
    this.close();
    this.dialog.removeEventListener('click', this.onClick);
    this.dialog.removeEventListener('pointerdown', this.onPointerDown);
    this.dialog.removeEventListener('pointerup', this.onPointerUp);
    this.dialog.removeEventListener('pointercancel', this.onPointerDown);
    this.dialog.removeEventListener('cancel', this.onCancel);
    this.dialog.removeEventListener('close', this.onClose);
  }
}
