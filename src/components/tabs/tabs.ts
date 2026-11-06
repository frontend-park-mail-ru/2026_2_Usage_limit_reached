/** Переключатель вкладок. */
export class Tabs {
  private readonly tabs: HTMLButtonElement[];
  private readonly onChange: (value: string) => void;
  private readonly onClick: (event: MouseEvent) => void;
  private readonly onKeydown: (event: KeyboardEvent) => void;

  /**
   * @param root
   * @param onChange
   */
  constructor(root: HTMLElement, onChange: (value: string) => void) {
    this.tabs = [...root.querySelectorAll<HTMLButtonElement>('[role="tab"]')];
    this.onChange = onChange;
    this.onClick = this.handleClick.bind(this);
    this.onKeydown = this.handleKeydown.bind(this);
    for (const tab of this.tabs) {
      tab.addEventListener('click', this.onClick);
      tab.addEventListener('keydown', this.onKeydown);
    }
  }

  /** Снимает обработчики. */
  destroy(): void {
    for (const tab of this.tabs) {
      tab.removeEventListener('click', this.onClick);
      tab.removeEventListener('keydown', this.onKeydown);
    }
  }

  /**
   * Делает вкладку активной и сообщает о смене.
   * @param tab
   */
  private select(tab: HTMLButtonElement): void {
    if (tab.getAttribute('aria-selected') === 'true') {
      return;
    }
    for (const item of this.tabs) {
      const isSelected = item === tab;
      item.setAttribute('aria-selected', String(isSelected));
      item.tabIndex = isSelected ? 0 : -1;
    }
    this.onChange(tab.dataset.tab ?? '');
  }

  /**
   * Клик по вкладке.
   * @param event
   */
  private handleClick(event: MouseEvent): void {
    if (event.currentTarget instanceof HTMLButtonElement) {
      this.select(event.currentTarget);
    }
  }

  /**
   * Стрелки, Home и End.
   * @param event
   */
  private handleKeydown(event: KeyboardEvent): void {
    const count = this.tabs.length;
    const index = this.tabs.indexOf(event.currentTarget as HTMLButtonElement);
    const targets: Record<string, number> = {
      ArrowRight: (index + 1) % count,
      ArrowLeft: (index - 1 + count) % count,
      Home: 0,
      End: count - 1,
    };
    const next = this.tabs[targets[event.key] ?? -1];
    if (!next) {
      return;
    }
    event.preventDefault();
    next.focus();
    this.select(next);
  }
}
