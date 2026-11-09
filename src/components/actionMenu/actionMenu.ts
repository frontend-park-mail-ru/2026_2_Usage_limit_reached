import { requireElement } from '@/utils/helpers/dom.ts';

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
  private readonly onViewportChange: (event: Event) => void;

  /**
   * @param root
   * @param onSelect
   * @param alignment Край кнопки для выравнивания меню.
   */
  constructor(root: HTMLElement, onSelect: (action: string) => void, private readonly alignment: 'start' | 'end' = 'end') {
    this.root = root;
    this.button = requireElement<HTMLButtonElement>(root, '.action-menu__button');
    this.list = requireElement<HTMLElement>(root, '.action-menu__list');
    this.items = [...this.list.querySelectorAll<HTMLButtonElement>('[role^="menuitem"]')];
    this.onSelect = onSelect;

    this.onToggle = this.toggle.bind(this);
    this.onListClick = this.handleListClick.bind(this);
    this.onKeydown = this.handleKeydown.bind(this);
    this.onOutsideClick = this.handleOutsideClick.bind(this);
    this.onViewportChange = (event) => {
      if (!(event.target instanceof Node) || !this.list.contains(event.target)) {
        const bounds = this.button.getBoundingClientRect();
        if (!this.root.isConnected || bounds.bottom <= 0 || bounds.top >= window.innerHeight) {
          this.close();
        } else {
          this.position();
        }
      }
    };

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
    this.position();
    this.button.setAttribute('aria-expanded', 'true');
    this.items[0]?.focus({ preventScroll: true });
    document.addEventListener('click', this.onOutsideClick);
    document.addEventListener('scroll', this.onViewportChange, true);
    window.addEventListener('resize', this.onViewportChange);
  }

  /** Размещает меню у кнопки в пределах окна браузера. */
  private position(): void {
    const button = this.button.getBoundingClientRect();
    const margin = 8;
    const below = Math.max(0, window.innerHeight - button.bottom - margin * 2);
    const above = Math.max(0, button.top - margin * 2);
    const upwards = this.list.scrollHeight > below && above > below;
    const available = upwards ? above : below;
    this.list.style.setProperty('--action-menu-max-height', `${available}px`);
    const bounds = this.list.getBoundingClientRect();
    const anchor = this.alignment === 'start' ? button.left : button.right - bounds.width;
    const left = Math.max(margin, Math.min(anchor, window.innerWidth - bounds.width - margin));
    const top = upwards ? button.top - bounds.height - margin : button.bottom + margin;
    this.list.style.setProperty('--action-menu-left', `${left}px`);
    this.list.style.setProperty('--action-menu-top', `${top}px`);
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
    document.removeEventListener('scroll', this.onViewportChange, true);
    window.removeEventListener('resize', this.onViewportChange);
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
    const item = event.target instanceof Element ? event.target.closest<HTMLButtonElement>('[role^="menuitem"]') : null;
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
