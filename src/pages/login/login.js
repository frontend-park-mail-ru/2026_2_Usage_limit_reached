import { render } from '../../app/view.js';

const template = `
  <section class="page page--login">
    <h1 class="page__title">Вход</h1>
    <p class="page__text">Страница логина в разработке.</p>
  </section>
`;

export function renderLogin() {
  return render(template);
}
