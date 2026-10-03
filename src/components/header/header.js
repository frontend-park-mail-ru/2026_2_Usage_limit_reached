import { render } from '../../app/view.js';

export function renderHeader() {
  return render('components/header/header');
}

/**
 * Вешает обработчики клика на ссылки шапки, чтобы переходы шли через роутер.
 * Вызывается один раз при старте приложения.
 *
 * @param {(path: string) => void} navigate - Функция навигации из роутера.
 */
export function bindHeaderLinks(navigate) {
  document.querySelectorAll('#header a[data-link]').forEach((link) => {
    link.addEventListener('click', (e) => {
      e.preventDefault();
      navigate(link.getAttribute('href'));
    });
  });
}
