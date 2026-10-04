import { renderLogin, initLogin } from '../pages/login/login.js';
import { renderRegister, initRegister } from '../pages/register/register.js';
import { renderProfile } from '../pages/profile/profile.js';
import { renderNotFound } from '../pages/notFound/notFound.js';

const routes = {
  '/login': { render: renderLogin, init: initLogin },
  '/register': { render: renderRegister, init: initRegister },
  '/profile': { render: renderProfile },
};

const notFoundRoute = { render: renderNotFound };

function renderCurrentRoute() {
  const path = window.location.pathname;
  const route = routes[path] || notFoundRoute;
  const root = document.getElementById('app');

  root.innerHTML = route.render();
  bindPageLinks(root);
  if (route.init) {
    route.init(root);
  }
}

/**
 * Вешает обработчики на внутренние ссылки страницы.
 * @param {HTMLElement} root
 */
function bindPageLinks(root) {
  root.querySelectorAll('a[data-link]').forEach((link) => {
    link.addEventListener('click', (e) => {
      e.preventDefault();
      navigate(link.getAttribute('href'));
    });
  });
}

/**
 * Переходит на указанный путь без перезагрузки страницы.
 * @param {string} path
 */
export function navigate(path) {
  history.pushState({}, '', path);
  renderCurrentRoute();
}

/**
 * Слушает переходы по кнопкам назад/вперед.
 */
export function initRouter() {
  window.addEventListener('popstate', renderCurrentRoute);
  renderCurrentRoute();
}
