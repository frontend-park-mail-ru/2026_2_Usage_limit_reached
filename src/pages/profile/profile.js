import { render } from '../../app/view.js';

const template = `
  <section class="page page--profile">
    <h1 class="page__title">Профиль</h1>
    <p class="page__text">Страница профиля в разработке.</p>
  </section>
`;

export function renderProfile() {
  return render(template);
}
