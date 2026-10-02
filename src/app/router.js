import { renderLogin, initLogin } from '../pages/login/login.js';
import { renderRegister, initRegister } from '../pages/register/register.js';
import { renderProfile } from '../pages/profile/profile.js';
import { renderNotFound } from '../pages/notFound/notFound.js';

/**
 * Страница: функция рендера и необязательная функция,
 * которая вешает обработчики событий после вставки HTML.
 * @typedef {Object} Route
 * @property {() => string} render - Возвращает HTML страницы.
 * @property {(root: HTMLElement) => void} [init] - Подключает обработчики к отрисованной странице.
 */

/**
 * Соответствие URL-пути и страницы.
 * @type {Object<string, Route>}
 */
const routes = {
  '/login': { render: renderLogin, init: initLogin },
  '/register': { render: renderRegister, init: initRegister },
  '/profile': { render: renderProfile },
};

/** @type {Route} */
const notFoundRoute = { render: renderNotFound };

/**
 * Находит страницу по текущему URL, отрисовывает её в #app
 * и вызывает её init, если он есть. Для неизвестного пути показывает 404.
 */
function renderCurrentRoute() {
  const path = window.location.pathname;
  const route = routes[path] || notFoundRoute;
  const root = document.getElementById('app');

  root.innerHTML = route.render();
  if (route.init) {
    route.init(root);
  }
}

/**
 * Переходит на указанный путь без перезагрузки страницы.
 * @param {string} path - Путь, на который нужно перейти.
 */
export function navigate(path) {
  history.pushState({}, '', path);
  renderCurrentRoute();
}

/**
 * Перехватывает клики по внутренним ссылкам, реагирует на кнопки
 * назад/вперед и рендерит страницу, соответствующую текущему URL.
 * Вызывается один раз при старте.
 */
export function initRouter() {
  document.addEventListener('click', (e) => {
    const link = e.target.closest('a[data-link]');
    if (!link) return;
    e.preventDefault();
    navigate(link.getAttribute('href'));
  });

  window.addEventListener('popstate', renderCurrentRoute);
  renderCurrentRoute();
}
