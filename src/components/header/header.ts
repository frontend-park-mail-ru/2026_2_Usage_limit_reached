import { render } from '../../app/view.js';

export function renderHeader(): string {
  return render('components/header/header');
}

export function bindHeaderLinks(navigate: (path: string) => void): void {
  document.querySelectorAll('#header a[data-link]').forEach((link) => {
    link.addEventListener('click', (e) => {
      e.preventDefault();
      const href = link.getAttribute('href');
      if (href) navigate(href);
    });
  });
}
