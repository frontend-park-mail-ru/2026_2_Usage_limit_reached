import { ALLOWED_TAGS, LINK_REL, REMOVED_WITH_CONTENT, SAFE_LINK_PROTOCOL, TAG_ALIASES } from './sanitize.constants.ts';

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
