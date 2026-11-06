import { ActionMenu } from '../actionMenu/actionMenu.ts';
import type { LinkDialog } from '../linkDialog/linkDialog.ts';
import { requireElement } from '../../utils/helpers/dom.ts';
import { sanitizeHtml } from '../../modules/sanitize/sanitize.ts';
import { BLOCK_LABELS, FORMAT_COMMANDS } from './richEditor.constants.ts';
import type { BlockType } from './richEditor.types.ts';

/** Редактор текста поста с панелью форматирования. */
export class RichEditor {
  private readonly content: HTMLElement;
  private readonly valueInput: HTMLInputElement;
  private readonly toolbar: HTMLElement;
  private readonly tools: HTMLButtonElement[];
  private readonly blockLabel: HTMLElement;
  private readonly blockOptions: HTMLButtonElement[];
  private readonly blockMenu: ActionMenu;
  private readonly linkDialog: LinkDialog;
  private readonly onChange: () => void;
  private readonly onFocus: () => void;
  private readonly onInput: () => void;
  private readonly onPaste: (event: ClipboardEvent) => void;
  private readonly onDrop: (event: DragEvent) => void;
  private readonly onToolbarPointerDown: (event: PointerEvent) => void;
  private readonly onToolbarClick: (event: MouseEvent) => void;
  private readonly onSelectionChange: () => void;
  private savedRange: Range | null = null;

  /**
   * @param root
   * @param linkDialog
   * @param onChange
   */
  constructor(root: HTMLElement, linkDialog: LinkDialog, onChange: () => void = () => {}) {
    this.content = requireElement<HTMLElement>(root, '.rich-editor__content');
    this.valueInput = requireElement<HTMLInputElement>(root, '[data-rich-editor-value]');
    this.toolbar = requireElement<HTMLElement>(root, '.rich-editor__toolbar');
    this.tools = [...this.toolbar.querySelectorAll<HTMLButtonElement>('[data-command]')];
    this.blockLabel = requireElement<HTMLElement>(root, '[data-block-label]');
    this.blockOptions = [...root.querySelectorAll<HTMLButtonElement>('.rich-editor__block-option')];
    this.blockMenu = new ActionMenu(requireElement<HTMLElement>(root, '.rich-editor__block'), (block) => this.setBlock(block));
    this.linkDialog = linkDialog;
    this.onChange = onChange;

    this.onFocus = this.ensureParagraph.bind(this);
    this.onInput = this.handleInput.bind(this);
    this.onPaste = this.handlePaste.bind(this);
    this.onDrop = (event) => event.preventDefault();
    this.onToolbarPointerDown = (event) => event.preventDefault();
    this.onToolbarClick = this.handleToolbarClick.bind(this);
    this.onSelectionChange = this.handleSelectionChange.bind(this);

    document.execCommand('defaultParagraphSeparator', false, 'p');
    this.content.addEventListener('focus', this.onFocus);
    this.content.addEventListener('input', this.onInput);
    this.content.addEventListener('paste', this.onPaste);
    this.content.addEventListener('drop', this.onDrop);
    this.toolbar.addEventListener('pointerdown', this.onToolbarPointerDown);
    this.toolbar.addEventListener('click', this.onToolbarClick);
    document.addEventListener('selectionchange', this.onSelectionChange);
  }

  /** Возвращает очищенный HTML или пустую строку. */
  getValue(): string {
    return this.isEmpty() ? '' : sanitizeHtml(this.content.innerHTML);
  }

  /**
   * Подставляет текст без вызова onChange.
   * @param html
   */
  setValue(html: string): void {
    this.content.innerHTML = sanitizeHtml(html);
    this.sync();
  }

  /** Снимает обработчики. */
  destroy(): void {
    this.blockMenu.destroy();
    this.content.removeEventListener('focus', this.onFocus);
    this.content.removeEventListener('input', this.onInput);
    this.content.removeEventListener('paste', this.onPaste);
    this.content.removeEventListener('drop', this.onDrop);
    this.toolbar.removeEventListener('pointerdown', this.onToolbarPointerDown);
    this.toolbar.removeEventListener('click', this.onToolbarClick);
    document.removeEventListener('selectionchange', this.onSelectionChange);
  }

  /** Пусто ли поле. */
  private isEmpty(): boolean {
    return !this.content.textContent?.trim() && !this.content.querySelector('li');
  }

  /** Обновляет скрытое поле формы и подсказку. */
  private sync(): void {
    this.valueInput.value = this.getValue();
    this.content.toggleAttribute('data-empty', this.isEmpty());
  }

  /** Заворачивает текст без абзаца в абзац и ставит курсор в его конец. */
  private ensureParagraph(): void {
    if (this.content.querySelector('p, h3, ul, ol')) {
      return;
    }
    const paragraph = document.createElement('p');
    paragraph.append(...this.content.childNodes);
    if (!paragraph.textContent) {
      paragraph.replaceChildren(document.createElement('br'));
    }
    this.content.replaceChildren(paragraph);
    const range = document.createRange();
    range.selectNodeContents(paragraph);
    range.collapse(false);
    document.getSelection()?.removeAllRanges();
    document.getSelection()?.addRange(range);
  }

  /** Ввод текста. */
  private handleInput(): void {
    this.ensureParagraph();
    this.sync();
    this.onChange();
  }

  /**
   * Вставляет из буфера только очищенную разметку.
   * @param event
   */
  private handlePaste(event: ClipboardEvent): void {
    event.preventDefault();
    const html = event.clipboardData?.getData('text/html');
    if (html) {
      this.run('insertHTML', sanitizeHtml(html));
    } else {
      this.run('insertText', event.clipboardData?.getData('text/plain') ?? '');
    }
  }

  /**
   * Кнопки панели.
   * @param event
   */
  private handleToolbarClick(event: MouseEvent): void {
    if (!(event.target instanceof Element)) {
      return;
    }
    const command = event.target.closest<HTMLElement>('[data-command]')?.dataset.command;
    if (command && FORMAT_COMMANDS.includes(command)) {
      this.run(command);
    } else if (event.target.closest('[data-link-button]')) {
      this.openLinkDialog();
    }
  }

  /** Запоминает выделение внутри поля и подсвечивает кнопки. */
  private handleSelectionChange(): void {
    if (!this.content.isConnected) {
      this.destroy();
      return;
    }
    const selection = document.getSelection();
    if (!selection?.rangeCount || !this.content.contains(selection.anchorNode)) {
      return;
    }
    this.savedRange = selection.getRangeAt(0).cloneRange();
    this.updateToolbar();
  }

  /** Показывает, какое оформление стоит под курсором. */
  private updateToolbar(): void {
    for (const tool of this.tools) {
      tool.setAttribute('aria-pressed', String(document.queryCommandState(tool.dataset.command ?? '')));
    }
    const block: BlockType = document.queryCommandValue('formatBlock').toLowerCase() === 'h3' ? 'h3' : 'p';
    this.blockLabel.textContent = BLOCK_LABELS[block];
    for (const option of this.blockOptions) {
      option.setAttribute('aria-checked', String(option.dataset.action === block));
    }
  }

  /** Возвращает фокус и выделение в поле. */
  private restoreSelection(): void {
    this.content.focus();
    const selection = document.getSelection();
    let range = this.savedRange;
    if (!range) {
      range = document.createRange();
      range.selectNodeContents(this.content);
      range.collapse(false);
    }
    selection?.removeAllRanges();
    selection?.addRange(range);
  }

  /**
   * Выполняет команду форматирования в поле.
   * @param command
   * @param value
   */
  private run(command: string, value?: string): void {
    this.restoreSelection();
    document.execCommand(command, false, value);
    this.updateToolbar();
  }

  /**
   * Меняет тип текущего абзаца.
   * @param block
   */
  private setBlock(block: string): void {
    if (Object.hasOwn(BLOCK_LABELS, block)) {
      this.run('formatBlock', `<${block}>`);
    }
  }

  /** Открывает окно ссылки с выделенным текстом. */
  private openLinkDialog(): void {
    const range = this.savedRange?.cloneRange() ?? null;
    this.linkDialog.open(range?.toString() ?? '', (text, href) => {
      this.savedRange = range;
      const link = document.createElement('a');
      link.href = href;
      link.textContent = text;
      this.run('insertHTML', sanitizeHtml(link.outerHTML));
    }, () => {
      this.savedRange = range;
      this.restoreSelection();
    });
  }
}
