import { ALLOWED_TAGS, LINK_REL, REMOVED_WITH_CONTENT, SAFE_LINK_PROTOCOL, TAG_ALIASES, TEXT_BLOCKS } from './sanitize.constants.ts';

/**
 * Возвращает полный https-адрес или null.
 * @param href
 */
export function normalizeUrl(href: string): string | null {
  try {
    const url = new URL(href.trim());
    return url.protocol === SAFE_LINK_PROTOCOL ? url.href : null;
  } catch {
    return null;
  }
}

/**
 * Копирует узел, оставляя только разрешённую разметку.
 * @param node
 * @param doc
 */
function cleanNode(node: Node, doc: Document): Node[] {
  if (node.nodeType === Node.TEXT_NODE) {
    return [doc.createTextNode(node.textContent ?? '')];
  }
  if (node.nodeType !== Node.ELEMENT_NODE) {
    return [];
  }
  const element = node as Element;
  const name = element.nodeName.toUpperCase();
  if (REMOVED_WITH_CONTENT.has(name)) {
    return [];
  }
  const children = [...element.childNodes].flatMap((child) => cleanNode(child, doc));
  const tag = TAG_ALIASES[name] ?? name;
  const href = tag === 'A' ? normalizeUrl(element.getAttribute('href') ?? '') : null;
  if (!ALLOWED_TAGS.has(tag) || (tag === 'A' && !href)) {
    return children;
  }
  const clean = doc.createElement(tag);
  if (href) {
    clean.setAttribute('href', href);
    clean.setAttribute('target', '_blank');
    clean.setAttribute('rel', LINK_REL);
  }
  clean.append(...children);
  return [clean];
}

/**
 * Оставляет в HTML поста только разрешённые теги и https-ссылки.
 * @param html
 */
export function sanitizeHtml(html: string): string {
  const doc = new DOMParser().parseFromString(html, 'text/html');
  const container = doc.createElement('div');
  container.append(...[...doc.body.childNodes].flatMap((child) => cleanNode(child, doc)));
  return container.innerHTML;
}

/**
 * Извлекает текст превью с компактными абзацами и обозначениями пунктов списка.
 * @param html
 */
export function htmlToText(html: string): string {
  const body = new DOMParser().parseFromString(html, 'text/html').body;
  const markers = new Map<Element, string>();
  for (const list of body.querySelectorAll<HTMLOListElement | HTMLUListElement>('ol, ul')) {
    const items = [...list.children].filter((child) => child.tagName === 'LI');
    const ordered = list instanceof HTMLOListElement;
    const step = ordered && list.reversed ? -1 : 1;
    let number = ordered ? (list.reversed && !list.hasAttribute('start') ? items.length : list.start) : 1;
    for (const item of items) {
      if (ordered && item.hasAttribute('value')) {
        number = (item as HTMLLIElement).value;
      }
      markers.set(item, ordered ? `${number}. ` : '• ');
      number += step;
    }
  }

  const readText = (node: Node): string => {
    if (node.nodeType === Node.TEXT_NODE) {
      return (node.textContent ?? '').replace(/\s+/gu, ' ');
    }
    if (node.nodeType !== Node.ELEMENT_NODE) {
      return '';
    }
    const element = node as Element;
    const tag = element.tagName.toUpperCase();
    if (REMOVED_WITH_CONTENT.has(tag)) {
      return '';
    }
    if (tag === 'BR' || tag === 'HR') {
      return '\n';
    }
    const text = [...node.childNodes].map(readText).join('');
    if (tag === 'LI') {
      return text.trim() ? `\n${markers.get(element) ?? '• '}${text.trim()}\n` : '';
    }
    return TEXT_BLOCKS.has(tag) ? `\n${text}\n` : text;
  };
  return readText(body).split('\n')
    .map((line) => line.replace(/ +/g, ' ').trim())
    .filter(Boolean).join('\n');
}
