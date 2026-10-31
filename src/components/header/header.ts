import { render } from '../../app/view.ts';
import { isRoutePath } from '../../app/paths.ts';
import type { Navigate } from '../../app/paths.ts';

export function renderHeader(): string {
  return render('components/header/header');
}

/**
 * Подключает переходы по ссылкам шапки через роутер.
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
