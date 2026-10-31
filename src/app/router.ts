import { renderLogin, initLogin } from '../pages/login/login.ts';
import { renderHome, initHome } from '../pages/home/home.ts';
import { renderRegister, initRegister } from '../pages/register/register.ts';
import { renderProfile, initProfile } from '../pages/profile/profile.ts';
import { renderNotFound } from '../pages/notFound/notFound.ts';
import { renderSidebar, bindSidebarLinks, setActiveSidebarLink, closeSidebarMenu, destroySidebar } from '../components/sidebar/sidebar.ts';
import { requireElement } from '../utils/helpers/dom.ts';
import { ROUTES, isRoutePath } from './paths.ts';
import type { NavigateOptions, RoutePath } from './paths.ts';
import type { Layout, Route } from './router.types.ts';

const routes: Record<RoutePath, Route> = {
  [ROUTES.home]: { render: renderHome, init: initHome },
  [ROUTES.login]: { render: renderLogin, init: initLogin },
  [ROUTES.register]: { render: renderRegister, init: initRegister },
  [ROUTES.profile]: { render: renderProfile, init: initProfile, layout: 'sidebar' },
};

const notFoundRoute: Route = { render: renderNotFound };

let currentLayout: Layout | undefined;

/**
 * Обновляет сайдбар при смене layout.
 * @param layout
 */
function updateLayout(layout: Layout): void {
  if (currentLayout === layout) {
    return;
  }
  destroySidebar();
  const sidebar = requireElement<HTMLElement>(document, '#sidebar');
  const hasSidebar = layout === 'sidebar';
  if (hasSidebar) {
    sidebar.innerHTML = renderSidebar();
    bindSidebarLinks(navigate);
  } else {
    sidebar.innerHTML = '';
  }
  sidebar.hidden = !hasSidebar;
  requireElement(document, '#layout').classList.toggle('app-layout--sidebar', hasSidebar);
  currentLayout = layout;
}

/** Показывает страницу по текущему адресу. */
function renderCurrentRoute(): void {
  const path = window.location.pathname;
  const route = isRoutePath(path) ? routes[path] : notFoundRoute;
  const root = requireElement<HTMLElement>(document, '#app');

  closeSidebarMenu();
  updateLayout(route.layout || 'plain');
  setActiveSidebarLink(path);
  root.innerHTML = route.render();
  route.init?.(root, navigate);
}

/**
 * Открывает страницу по указанному пути.
 * @param path
 * @param options
 */
export function navigate(path: RoutePath, { replace = false }: NavigateOptions = {}): void {
  const url = new URL(path, window.location.href);
  if (url.pathname + url.search === window.location.pathname + window.location.search) {
    return;
  }
  if (replace) {
    history.replaceState({}, '', path);
  } else {
    history.pushState({}, '', path);
  }
  renderCurrentRoute();
}

/** Запускает роутер и подключает кнопки истории браузера. */
export function initRouter(): void {
  window.addEventListener('popstate', renderCurrentRoute);
  renderCurrentRoute();
}
