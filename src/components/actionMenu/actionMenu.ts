import { requireElement } from '../../utils/helpers/dom.ts';

/** Меню действий по кнопке «···». */
export class ActionMenu {
  private readonly root: HTMLElement;
  private readonly button: HTMLButtonElement;
  private readonly list: HTMLElement;
  private readonly items: HTMLButtonElement[];
  private readonly onSelect: (action: string) => void;
  private readonly onToggle: () => void;
  private readonly onListClick: (event: MouseEvent) => void;
  private readonly onKeydown: (event: KeyboardEvent) => void;
  private readonly onOutsideClick: (event: MouseEvent) => void;

  /**
   * @param root
   * @param onSelect
   */
  constructor(root: HTMLElement, onSelect: (action: string) => void) {
    this.root = root;
    this.button = requireElement<HTMLButtonElement>(root, '.action-menu__button');
    this.list = requireElement<HTMLElement>(root, '.action-menu__list');
    this.items = [...this.list.querySelectorAll<HTMLButtonElement>('[role="menuitem"]')];
    this.onSelect = onSelect;

    this.onToggle = this.toggle.bind(this);
    this.onListClick = this.handleListClick.bind(this);
    this.onKeydown = this.handleKeydown.bind(this);
    this.onOutsideClick = this.handleOutsideClick.bind(this);

    this.button.addEventListener('click', this.onToggle);
    this.list.addEventListener('click', this.onListClick);
    this.root.addEventListener('keydown', this.onKeydown);
  }

  /** Снимает обработчики. */
  destroy(): void {
    this.close();
    this.button.removeEventListener('click', this.onToggle);
    this.list.removeEventListener('click', this.onListClick);
    this.root.removeEventListener('keydown', this.onKeydown);
  }

  /** Открыто ли меню. */
  private get isOpen(): boolean {
    return !this.list.hidden;
  }

  /** Открывает меню и ставит фокус на первый пункт. */
  private open(): void {
    this.list.hidden = false;
    this.button.setAttribute('aria-expanded', 'true');
    this.items[0]?.focus();
    document.addEventListener('click', this.onOutsideClick);
  }

  /**
   * Закрывает меню.
   * @param returnFocus
   */
  private close(returnFocus = false): void {
    if (!this.isOpen) {
      return;
    }
    this.list.hidden = true;
    this.button.setAttribute('aria-expanded', 'false');
    document.removeEventListener('click', this.onOutsideClick);
    if (returnFocus) {
      this.button.focus();
    }
  }

  /** Открывает или закрывает меню. */
  private toggle(): void {
    if (this.isOpen) {
      this.close();
    } else {
      this.open();
    }
  }

  /**
   * Клик по пункту.
   * @param event
   */
  private handleListClick(event: MouseEvent): void {
    const item = event.target instanceof Element ? event.target.closest<HTMLButtonElement>('[role="menuitem"]') : null;
    if (!item) {
      return;
    }
    this.close(true);
    this.onSelect(item.dataset.action ?? '');
  }

  /**
   * Escape, стрелки и Tab.
   * @param event
   */
  private handleKeydown(event: KeyboardEvent): void {
    if (!this.isOpen) {
      return;
    }
    const count = this.items.length;
    const index = this.items.indexOf(document.activeElement as HTMLButtonElement);
    if (event.key === 'Escape') {
      event.preventDefault();
      this.close(true);
    } else if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault();
      const step = event.key === 'ArrowDown' ? 1 : -1;
      this.items[(index + step + count) % count]?.focus();
    } else if (event.key === 'Tab') {
      this.close();
    }
  }

  /**
   * Закрывает при клике снаружи.
   * @param event
   */
  private handleOutsideClick(event: MouseEvent): void {
    if (!this.root.isConnected || !(event.target instanceof Node) || !this.root.contains(event.target)) {
      this.close();
    }
  }
}
