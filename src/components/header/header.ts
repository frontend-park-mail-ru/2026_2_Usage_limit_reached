import { render } from '../../app/view.js';
import { isRoutePath } from '../../app/paths.js';
import type { Navigate } from '../../app/paths.js';

export function renderHeader(): string {
  return render('components/header/header');
}

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
