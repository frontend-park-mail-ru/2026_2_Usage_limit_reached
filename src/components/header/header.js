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
