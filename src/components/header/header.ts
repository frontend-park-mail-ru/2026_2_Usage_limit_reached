import headerTemplate from './header.hbs';
import { isRoutePath } from '../../app/paths.ts';
import type { Navigate } from '../../app/paths.ts';

export function renderHeader(): string {
  return headerTemplate();
}

/**
 * @param navigate
 */
export function bindHeaderLinks(navigate: Navigate): void {
  document.querySelectorAll('#header a[data-link]').forEach((link) => {
    link.addEventListener('click', (e) => {
      e.preventDefault();
      const href = link.getAttribute('href');
      if (href && isRoutePath(href)) {
        navigate(href);
      }
    });
  });
}
