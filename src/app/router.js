import { renderLogin, initLogin } from '../pages/login/login.js';
import { renderRegister, initRegister } from '../pages/register/register.js';
import { renderProfile } from '../pages/profile/profile.js';
import { renderNotFound } from '../pages/notFound/notFound.js';
import { renderSidebar, bindSidebarLinks } from '../components/sidebar/sidebar.js';

const routes = {
  '/login': { render: renderLogin, init: initLogin },
  '/register': { render: renderRegister, init: initRegister },
  '/profile': { render: renderProfile, layout: 'sidebar' },
};

const notFoundRoute = { render: renderNotFound };

/** Последний показанный layout; undefined означает первый рендер. */
let currentLayout;

/**
 * Пересоздаёт общую навигацию только при смене layout.
 * @param {string} layout - sidebar для профиля, plain для остальных страниц.
 */
function updateLayout(layout) {
  if (currentLayout === layout) return;
  const sidebar = document.getElementById('sidebar');
  const hasSidebar = layout === 'sidebar';
  sidebar.innerHTML = hasSidebar ? renderSidebar() : '';
  if (hasSidebar) bindSidebarLinks(navigate);
  sidebar.hidden = !hasSidebar;
  document.getElementById('layout').classList.toggle('app-layout--sidebar', hasSidebar);
  currentLayout = layout;
}

/**
 * Находит страницу по текущему URL, отрисовывает её в #app
 * и вызывает её init, если он есть. Для неизвестного пути показывает 404.
 */
function renderCurrentRoute() {
  const path = window.location.pathname;
  const route = routes[path] || notFoundRoute;
  const root = document.getElementById('app');

  updateLayout(route.layout || 'plain');
  const profileLink = document.querySelector('#sidebar a[data-link]');
  if (profileLink) {
    if (path === '/profile') profileLink.setAttribute('aria-current', 'page');
    else profileLink.removeAttribute('aria-current');
  }
  root.innerHTML = route.render();
  if (route.init) {
    route.init(root, navigate);
  }
}

/**
 * Переходит на указанный путь без перезагрузки страницы.
 * Текущий pathname + search не добавляет историю и не пересоздаёт страницу,
 * чтобы сохранить её состояние и фокус.
 * @param {string} path - Путь, на который нужно перейти.
 * @returns {void}
 */
export function navigate(path) {
  const url = new URL(path, window.location.href);
  if (url.pathname + url.search === window.location.pathname + window.location.search) return;
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
