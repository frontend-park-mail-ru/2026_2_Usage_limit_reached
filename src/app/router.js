import { renderLogin } from '../pages/login/login.js';
import { renderRegister } from '../pages/register/register.js';
import { renderProfile } from '../pages/profile/profile.js';
import { renderNotFound } from '../pages/notFound/notFound.js';

// Соответствие URL-пути и функции рендера страницы.
const routes = {
  '/login': renderLogin,
  '/register': renderRegister,
  '/profile': renderProfile,
};

function renderCurrentRoute() {
  const path = window.location.pathname;
  const page = routes[path] || renderNotFound;
  document.getElementById('app').innerHTML = page();
  bindLinks();
}

function bindLinks() {
  document.querySelectorAll('a[data-link]').forEach((link) => {
    // Пересоздаем ссылку, чтобы убрать старые обработчики при повторных вызовах.
    const cleanLink = link.cloneNode(true);
    link.replaceWith(cleanLink);

    cleanLink.addEventListener('click', (e) => {
      e.preventDefault();
      navigate(cleanLink.getAttribute('href'));
    });
  });
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
 * Слушает переходы по кнопкам назад/вперед и рендерит 
 * страницу, соответствующую текущему URL. Вызывается один раз при старте.
 */
export function initRouter() {
  window.addEventListener('popstate', renderCurrentRoute);
  renderCurrentRoute();
}
