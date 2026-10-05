import { renderLogin, initLogin } from '../pages/login/login.js';
import { renderRegister, initRegister } from '../pages/register/register.js';
import { renderProfile, initProfile } from '../pages/profile/profile.js';
import { renderNotFound } from '../pages/notFound/notFound.js';
import { renderSidebar, bindSidebarLinks, setActiveSidebarLink, closeSidebarMenu, destroySidebar } from '../components/sidebar/sidebar.js';

const routes = {
  '/login': { render: renderLogin, init: initLogin },
  '/register': { render: renderRegister, init: initRegister },
  '/profile': { render: renderProfile, init: initProfile, layout: 'sidebar' },
};

const notFoundRoute = { render: renderNotFound };

let currentLayout;

/**
 * Обновляет сайдбар при смене layout.
 * @param {string} layout - Layout страницы.
 * @returns {void}
 */
function updateLayout(layout) {
  if (currentLayout === layout) return;
  destroySidebar();
  const sidebar = document.getElementById('sidebar');
  const hasSidebar = layout === 'sidebar';
  if (hasSidebar) {
    sidebar.innerHTML = renderSidebar();
    bindSidebarLinks(navigate);
  } else {
    sidebar.innerHTML = '';
  }
  sidebar.hidden = !hasSidebar;
  document.getElementById('layout').classList.toggle('app-layout--sidebar', hasSidebar);
  currentLayout = layout;
}

/**
 * Показывает страницу по текущему адресу.
 * @returns {void}
 */
function renderCurrentRoute() {
  const path = window.location.pathname;
  const route = routes[path] || notFoundRoute;
  const root = document.getElementById('app');

  closeSidebarMenu();
  updateLayout(route.layout || 'plain');
  setActiveSidebarLink(path);
  root.innerHTML = route.render();
  route.init?.(root, navigate);
}

/**
 * Открывает страницу по указанному пути.
 * @param {string} path - Путь страницы.
 * @returns {void}
 */
export function navigate(path) {
  const url = new URL(path, window.location.href);
  if (url.pathname + url.search === window.location.pathname + window.location.search) return;
  history.pushState({}, '', path);
  renderCurrentRoute();
}

/**
 * Запускает роутер и подключает кнопки истории браузера.
 * @returns {void}
 */
export function initRouter() {
  window.addEventListener('popstate', renderCurrentRoute);
  renderCurrentRoute();
}
