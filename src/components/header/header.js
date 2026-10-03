import { render } from '../../app/view.js';

const template = `
  <header class="header">
    <a href="/profile" data-link>Профиль</a>
    <a href="/login" data-link>Вход</a>
    <a href="/register" data-link>Регистрация</a>
  </header>
`;

export function renderHeader() {
  return render(template);
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
