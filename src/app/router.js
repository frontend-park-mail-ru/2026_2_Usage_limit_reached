import { renderLogin } from '../pages/login/login.js';
import { renderRegister } from '../pages/register/register.js';
import { renderProfile } from '../pages/profile/profile.js';
import { renderNotFound } from '../pages/notFound/notFound.js';

/**
 * Соответствие URL-пути и функции рендера страницы.
 * @type {Record<string, () => string>}
 */
const routes = {
  '/login': renderLogin,
  '/register': renderRegister,
  '/profile': renderProfile,
};

function renderCurrentRoute() {
  const path = window.location.pathname;
  const page = routes[path] || renderNotFound;
  document.getElementById('app').innerHTML = page();
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
