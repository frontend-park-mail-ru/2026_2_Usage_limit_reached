import { isRoutePath } from '../../app/paths.ts';
import type { Navigate } from '../../app/paths.ts';

/**
 * Подключает SPA-переходы для текущих и будущих ссылок контейнера.
 * Сохраняет параметры адреса, ссылки с якорем обрабатывает браузер.
 * Возвращает функцию снятия обработчика.
 * @param container
 * @param navigate
 */
export function bindLinks(container: HTMLElement, navigate: Navigate): () => void {
  const handleClick = (event: MouseEvent): void => {
    if (
      event.defaultPrevented || event.button !== 0
      || event.ctrlKey || event.metaKey || event.shiftKey || event.altKey
      || !(event.target instanceof Element)
    ) {
      return;
    }

    const link = event.target.closest('a[data-link]');
    if (!(link instanceof HTMLAnchorElement) || !container.contains(link)) {
      return;
    }

    const target = link.getAttribute('target') || document.querySelector('base[target]')?.getAttribute('target');
    if (link.hasAttribute('download') || (target && target.toLowerCase() !== '_self')) {
      return;
    }
    if (!link.getAttribute('href')) {
      return;
    }

    let url: URL;
    try {
      url = new URL(link.href);
    } catch {
      return;
    }
    if (
      url.origin !== window.location.origin || url.href.includes('#')
      || !isRoutePath(url.pathname)
    ) {
      return;
    }

    event.preventDefault();
    navigate(url.search ? `${url.pathname}?${url.search.slice(1)}` : url.pathname);
  };

  container.addEventListener('click', handleClick);
  return () => {
    container.removeEventListener('click', handleClick);
  };
}
