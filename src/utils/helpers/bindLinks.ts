import { isRoutePath } from '../../app/paths.js';
import type { Navigate } from '../../app/paths.js';

/**
 * @param container
 * @param navigate
 */
export function bindLinks(container: HTMLElement, navigate: Navigate): void {
  container.querySelectorAll('a[data-link]').forEach((link) => {
    link.addEventListener('click', (event) => {
      event.preventDefault();
      const href = link.getAttribute('href');
      if (href && isRoutePath(href)) {
        navigate(href);
      }
    });
  });
}
