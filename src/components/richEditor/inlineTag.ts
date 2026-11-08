import { INLINE_TAG_SELECTORS } from './richEditor.constants.ts';
import type { InlineTag, TextPiece } from './richEditor.types.ts';

/**
 * Ближайший тег оформления вокруг узла внутри поля.
 * @param root
 * @param node
 * @param tag
 */
function findTag(root: HTMLElement, node: Node, tag: InlineTag): HTMLElement | null {
  const found = node.parentElement?.closest<HTMLElement>(INLINE_TAG_SELECTORS[tag]);
  return found && root.contains(found) ? found : null;
}

/**
 * Текстовые узлы выделения с границами.
 * @param range
 */
function getPieces(range: Range): TextPiece[] {
  const container = range.commonAncestorContainer;
  if (container instanceof Text) {
    return range.collapsed ? [] : [{ node: container, start: range.startOffset, end: range.endOffset }];
  }
  const pieces: TextPiece[] = [];
  const walker = document.createTreeWalker(container, NodeFilter.SHOW_TEXT);
  while (walker.nextNode()) {
    const node = walker.currentNode as Text;
    if (!range.intersectsNode(node)) {
      continue;
    }
    const start = node === range.startContainer ? range.startOffset : 0;
    const end = node === range.endContainer ? range.endOffset : node.length;
    if (start < end) {
      pieces.push({ node, start, end });
    }
  }
  return pieces;
}

/**
 * Отрезает от узлов текст за границами выделения.
 * @param pieces
 */
function splitPieces(pieces: TextPiece[]): Text[] {
  return pieces.map(({ node, start, end }) => {
    if (end < node.length) {
      node.splitText(end);
    }
    return start > 0 ? node.splitText(start) : node;
  });
}

/**
 * Есть ли в фрагменте видимое содержимое.
 * @param fragment
 */
function hasContent(fragment: DocumentFragment): boolean {
  return !!fragment.textContent || !!fragment.querySelector('br');
}

/**
 * Выносит текст из тега, сохраняя тег вокруг соседнего текста.
 * @param text
 * @param wrap
 */
function unwrapText(text: Text, wrap: HTMLElement): void {
  const range = document.createRange();
  range.setStart(wrap, 0);
  range.setEndBefore(text);
  const head = range.extractContents();
  range.setStartAfter(text);
  range.setEnd(wrap, wrap.childNodes.length);
  const tail = range.extractContents();
  if (hasContent(head)) {
    const before = wrap.cloneNode(false) as HTMLElement;
    before.append(head);
    wrap.before(before);
  }
  if (hasContent(tail)) {
    const after = wrap.cloneNode(false) as HTMLElement;
    after.append(tail);
    wrap.after(after);
  }
  wrap.replaceWith(...wrap.childNodes);
}

/**
 * Заворачивает текст в тег и склеивает с такими же тегами по соседству.
 * @param text
 * @param tag
 */
function wrapText(text: Text, tag: InlineTag): void {
  const wrap = document.createElement(tag);
  text.before(wrap);
  wrap.append(text);
  const next = wrap.nextSibling;
  if (next instanceof HTMLElement && next.tagName === wrap.tagName) {
    wrap.append(...next.childNodes);
    next.remove();
  }
  const previous = wrap.previousSibling;
  if (previous instanceof HTMLElement && previous.tagName === wrap.tagName) {
    previous.append(...wrap.childNodes);
    wrap.remove();
  }
}

/**
 * Весь ли выделенный текст уже оформлен тегом.
 * @param root
 * @param range
 * @param tag
 */
export function isInlineTagActive(root: HTMLElement, range: Range, tag: InlineTag): boolean {
  const pieces = getPieces(range);
  return pieces.length > 0 && pieces.every(({ node }) => !!findTag(root, node, tag));
}

/**
 * Ставит или снимает тег у выделения, не трогая другое оформление.
 * @param root
 * @param range
 * @param tag
 */
export function toggleInlineTag(root: HTMLElement, range: Range, tag: InlineTag): void {
  const isActive = isInlineTagActive(root, range, tag);
  const texts = splitPieces(getPieces(range));
  for (const text of texts) {
    if (isActive) {
      let wrap = findTag(root, text, tag);
      while (wrap) {
        unwrapText(text, wrap);
        wrap = findTag(root, text, tag);
      }
    } else if (!findTag(root, text, tag)) {
      wrapText(text, tag);
    }
  }
}

/**
 * Позиция в тексте поля: сколько символов до точки.
 * @param root
 * @param node
 * @param offset
 */
export function getTextOffset(root: HTMLElement, node: Node, offset: number): number {
  const range = document.createRange();
  range.setStart(root, 0);
  range.setEnd(node, offset);
  return range.toString().length;
}

/**
 * Выделение по позициям в тексте поля.
 * @param root
 * @param start
 * @param end
 */
export function createTextRange(root: HTMLElement, start: number, end: number): Range {
  const range = document.createRange();
  range.selectNodeContents(root);
  range.collapse(false);
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  let passed = 0;
  let hasStart = false;
  while (walker.nextNode()) {
    const node = walker.currentNode as Text;
    if (!hasStart && start <= passed + node.length) {
      range.setStart(node, start - passed);
      hasStart = true;
    }
    if (hasStart && end <= passed + node.length) {
      range.setEnd(node, end - passed);
      return range;
    }
    passed += node.length;
  }
  return range;
}
