import { render } from '../../app/view.js';

const template = `
  <section class="page page--not-found">
    <h1 class="page__title">Страница не найдена</h1>
    <p class="page__text">Такой страницы не существует.</p>
  </section>
`;

export function renderNotFound() {
  return render(template);
}
