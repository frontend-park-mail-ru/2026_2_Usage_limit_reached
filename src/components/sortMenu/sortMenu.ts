import { ActionMenu } from '@/components/actionMenu/actionMenu.ts';
import { requireElement } from '@/utils/helpers/dom.ts';

/** Список «Сначала новые / старые / популярные». */
export class SortMenu {
  private readonly menu: ActionMenu;
  private readonly label: HTMLElement;
  private readonly options: HTMLButtonElement[];

  /**
   * @param root
   * @param onChange
   */
  constructor(root: HTMLElement, onChange: (value: string) => void) {
    this.label = requireElement<HTMLElement>(root, '[data-sort-label]');
    this.options = [...root.querySelectorAll<HTMLButtonElement>('.sort-menu__option')];
    this.menu = new ActionMenu(root, (value) => {
      const option = this.options.find((item) => item.dataset.action === value);
      if (!option || option.getAttribute('aria-checked') === 'true') {
        return;
      }
      for (const item of this.options) {
        item.setAttribute('aria-checked', String(item === option));
      }
      this.label.textContent = option.textContent;
      this.label.setAttribute('aria-label', `Порядок: ${option.textContent ?? ''}`);
      onChange(value);
    });
  }

  /** Снимает обработчики. */
  destroy(): void {
    this.menu.destroy();
  }
}
