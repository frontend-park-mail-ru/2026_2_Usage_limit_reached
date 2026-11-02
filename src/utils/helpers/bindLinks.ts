import { isRoutePath } from '../../app/paths.ts';
import type { Navigate } from '../../app/paths.ts';

/**
 * Подключает переходы по ссылкам контейнера.
 * @param container
 * @param navigate
 */
export function bindLinks(container: HTMLElement, navigate: Navigate): void {
  container.querySelectorAll<HTMLAnchorElement>('a[data-link]').forEach((link) => {
    link.addEventListener('click', (event) => {
      if (
        event.defaultPrevented || event.button !== 0
        || event.ctrlKey || event.metaKey || event.shiftKey || event.altKey
      ) {
        return;
      }

      const href = link.getAttribute('href');
      if (!href || !isRoutePath(href)) {
        return;
      }

      event.preventDefault();
      navigate(href);
    });
  });
}
