import { ActionMenu } from '@/components/actionMenu/actionMenu.ts';
import type { LinkDialog } from '@/components/linkDialog/linkDialog.ts';
import { requireElement } from '@/utils/helpers/dom.ts';
import { sanitizeHtml } from '@/modules/sanitize/sanitize.ts';
import { createTextRange, getTextOffset, isInlineTagActive, toggleInlineTag } from './inlineTag.ts';
import { BLOCK_LABELS, FORMAT_COMMANDS, INLINE_TAGS, TEXT_BLOCKS } from './richEditor.constants.ts';
import type { BlockType } from './richEditor.types.ts';

/** Редактор текста поста с панелью форматирования. */
export class RichEditor {
  private readonly content: HTMLElement;
  private readonly valueInput: HTMLInputElement;
  private readonly form: HTMLFormElement | null;
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
  private readonly onSubmit: () => void;
  private savedRange: Range | null = null;

  /**
   * @param root
   * @param linkDialog
   * @param onChange
   */
  constructor(root: HTMLElement, linkDialog: LinkDialog, onChange: () => void = () => {}) {
    this.content = requireElement<HTMLElement>(root, '.rich-editor__content');
    this.valueInput = requireElement<HTMLInputElement>(root, '[data-rich-editor-value]');
    this.form = this.valueInput.form;
    this.toolbar = requireElement<HTMLElement>(root, '.rich-editor__toolbar');
    this.tools = [...this.toolbar.querySelectorAll<HTMLButtonElement>('[data-command]')];
    this.blockLabel = requireElement<HTMLElement>(root, '[data-block-label]');
    this.blockOptions = [...root.querySelectorAll<HTMLButtonElement>('.rich-editor__block-option')];
    this.blockMenu = new ActionMenu(requireElement<HTMLElement>(root, '.rich-editor__block'), (block) => this.setBlock(block), 'start');
    this.linkDialog = linkDialog;
    this.onChange = onChange;

    this.onFocus = this.ensureParagraph.bind(this);
    this.onInput = this.handleInput.bind(this);
    this.onPaste = this.handlePaste.bind(this);
    this.onDrop = (event) => event.preventDefault();
    this.onToolbarPointerDown = (event) => event.preventDefault();
    this.onToolbarClick = this.handleToolbarClick.bind(this);
    this.onSelectionChange = this.handleSelectionChange.bind(this);
    this.onSubmit = this.handleSubmit.bind(this);

    document.execCommand('defaultParagraphSeparator', false, 'p');
    this.content.addEventListener('focus', this.onFocus);
    this.content.addEventListener('input', this.onInput);
    this.content.addEventListener('paste', this.onPaste);
    this.content.addEventListener('drop', this.onDrop);
    this.toolbar.addEventListener('pointerdown', this.onToolbarPointerDown);
    this.toolbar.addEventListener('click', this.onToolbarClick);
    document.addEventListener('selectionchange', this.onSelectionChange);
    this.form?.addEventListener('submit', this.onSubmit, true);
  }

  /** Возвращает HTML поля или пустую строку. */
  getHtml(): string {
    return this.isEmpty() ? '' : this.content.innerHTML;
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
    this.form?.removeEventListener('submit', this.onSubmit, true);
  }

  /** Пусто ли поле. */
  private isEmpty(): boolean {
    return !this.content.textContent?.trim() && !this.content.querySelector('li');
  }

  /** Обновляет скрытое поле формы и подсказку. */
  private sync(): void {
    this.valueInput.value = this.getHtml();
    this.content.toggleAttribute('data-empty', this.isEmpty());
  }

  /** Кладёт в форму очищенный текст перед отправкой. */
  private handleSubmit(): void {
    this.valueInput.value = sanitizeHtml(this.getHtml());
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
      this.format(command);
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
    const range = this.savedRange;
    for (const tool of this.tools) {
      const command = tool.dataset.command ?? '';
      const tag = INLINE_TAGS[command];
      const isActive = tag && range && !range.collapsed
        ? isInlineTagActive(this.content, range, tag)
        : document.queryCommandState(command);
      tool.setAttribute('aria-pressed', String(isActive));
    }
    const block: BlockType = document.queryCommandValue('formatBlock').toLowerCase() === 'h3' ? 'h3' : 'p';
    this.blockLabel.textContent = BLOCK_LABELS[block];
    for (const option of this.blockOptions) {
      option.setAttribute('aria-checked', String(option.dataset.action === block));
    }
  }

  /** Возвращает фокус и выделение в поле. */
  private restoreSelection(): void {
    const selection = document.getSelection();
    if (document.activeElement === this.content && selection?.rangeCount && this.content.contains(selection.anchorNode)) {
      return;
    }
    this.content.focus();
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
   * Применяет кнопку оформления: подчёркивание и зачёркивание без execCommand.
   * @param command
   */
  private format(command: string): void {
    const tag = INLINE_TAGS[command];
    const range = this.savedRange;
    if (!tag || !range || range.collapsed) {
      this.run(command);
      return;
    }
    const start = getTextOffset(this.content, range.startContainer, range.startOffset);
    const end = getTextOffset(this.content, range.endContainer, range.endOffset);
    const draft = this.content.cloneNode(true) as HTMLElement;
    toggleInlineTag(draft, createTextRange(draft, start, end), tag);
    const drafts = [...draft.querySelectorAll<HTMLElement>(TEXT_BLOCKS)];
    const blocks = [...this.content.querySelectorAll<HTMLElement>(TEXT_BLOCKS)];
    this.content.focus();
    blocks.forEach((block, index) => {
      const html = drafts[index]?.innerHTML;
      if (html !== undefined && html !== block.innerHTML) {
        this.replaceBlockContent(block, html);
      }
    });
    this.savedRange = createTextRange(this.content, start, end);
    document.getSelection()?.removeAllRanges();
    document.getSelection()?.addRange(this.savedRange);
    this.updateToolbar();
  }

  /**
   * Заменяет содержимое блока через insertHTML, чтобы правку отменял Ctrl+Z.
   * @param block
   * @param html
   */
  private replaceBlockContent(block: HTMLElement, html: string): void {
    const range = document.createRange();
    range.selectNodeContents(block);
    document.getSelection()?.removeAllRanges();
    document.getSelection()?.addRange(range);
    document.execCommand('insertHTML', false, html);
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
