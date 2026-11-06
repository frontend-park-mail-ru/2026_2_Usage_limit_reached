import { requireElement } from '../../utils/helpers/dom.ts';

/** Выпадающий список. */
export class Select {
  private readonly root: HTMLElement;
  private readonly input: HTMLInputElement;
  private readonly list: HTMLElement;
  private readonly options: HTMLElement[];
  private readonly onInputClick: () => void;
  private readonly onKeydown: (event: KeyboardEvent) => void;
  private readonly onListPointerDown: (event: PointerEvent) => void;
  private readonly onListClick: (event: MouseEvent) => void;
  private readonly onOutsideClick: (event: MouseEvent) => void;
  private activeIndex = -1;

  /**
   * @param root
   */
  constructor(root: HTMLElement) {
    this.root = root;
    this.input = requireElement<HTMLInputElement>(root, '.select__input');
    this.list = requireElement<HTMLElement>(root, '.select__list');
    this.options = [...this.list.querySelectorAll<HTMLElement>('[role="option"]')];

    this.onInputClick = this.toggle.bind(this);
    this.onKeydown = this.handleKeydown.bind(this);
    this.onListPointerDown = (event) => event.preventDefault();
    this.onListClick = this.handleListClick.bind(this);
    this.onOutsideClick = this.handleOutsideClick.bind(this);

    this.input.addEventListener('click', this.onInputClick);
    this.input.addEventListener('keydown', this.onKeydown);
    this.list.addEventListener('pointerdown', this.onListPointerDown);
    this.list.addEventListener('click', this.onListClick);
  }

  /** Снимает обработчики. */
  destroy(): void {
    this.close();
    this.input.removeEventListener('click', this.onInputClick);
    this.input.removeEventListener('keydown', this.onKeydown);
    this.list.removeEventListener('pointerdown', this.onListPointerDown);
    this.list.removeEventListener('click', this.onListClick);
  }

  /** Открыт ли список. */
  private get isOpen(): boolean {
    return !this.list.hidden;
  }

  /** Открывает список. */
  private open(): void {
    this.list.hidden = false;
    this.input.setAttribute('aria-expanded', 'true');
    const selected = this.options.findIndex((option) => option.getAttribute('aria-selected') === 'true');
    this.setActive(Math.max(selected, 0));
    document.addEventListener('click', this.onOutsideClick);
  }

  /** Закрывает список. */
  private close(): void {
    this.list.hidden = true;
    this.input.setAttribute('aria-expanded', 'false');
    this.input.removeAttribute('aria-activedescendant');
    document.removeEventListener('click', this.onOutsideClick);
  }

  /** Открывает или закрывает список. */
  private toggle(): void {
    if (this.isOpen) {
      this.close();
    } else {
      this.open();
    }
  }

  /**
   * Подсвечивает вариант.
   * @param index
   */
  private setActive(index: number): void {
    this.options[this.activeIndex]?.classList.remove('select__option_active');
    this.activeIndex = index;
    const option = this.options[index];
    if (!option) {
      return;
    }
    option.classList.add('select__option_active');
    option.scrollIntoView({ block: 'nearest' });
    this.input.setAttribute('aria-activedescendant', option.id);
  }

  /**
   * Выбирает вариант.
   * @param index
   */
  private choose(index: number): void {
    const option = this.options[index];
    if (!option) {
      return;
    }
    for (const item of this.options) {
      item.setAttribute('aria-selected', String(item === option));
    }
    this.input.value = option.dataset.value ?? '';
    this.close();
    this.input.dispatchEvent(new Event('input', { bubbles: true }));
  }

  /**
   * Клавиатура.
   * @param event
   */
  private handleKeydown(event: KeyboardEvent): void {
    const count = this.options.length;
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault();
      if (!this.isOpen) {
        this.open();
        return;
      }
      const step = event.key === 'ArrowDown' ? 1 : -1;
      this.setActive((this.activeIndex + step + count) % count);
    } else if ((event.key === 'Home' || event.key === 'End') && this.isOpen) {
      event.preventDefault();
      this.setActive(event.key === 'Home' ? 0 : count - 1);
    } else if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      if (this.isOpen) {
        this.choose(this.activeIndex);
      } else {
        this.open();
      }
    } else if (event.key === 'Escape' && this.isOpen) {
      event.preventDefault();
      this.close();
    } else if (event.key === 'Tab' && this.isOpen) {
      this.close();
    }
  }

  /**
   * Клик по варианту.
   * @param event
   */
  private handleListClick(event: MouseEvent): void {
    if (!(event.target instanceof Element)) {
      return;
    }
    const option = event.target.closest<HTMLElement>('[role="option"]');
    if (option) {
      this.choose(this.options.indexOf(option));
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
