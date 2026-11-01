import { renderLogin, initLogin } from '../pages/login/login.ts';
import { renderHome, initHome } from '../pages/home/home.ts';
import { renderRegister, initRegister } from '../pages/register/register.ts';
import { renderProfile, initProfile } from '../pages/profile/profile.ts';
import { renderNotFound } from '../pages/notFound/notFound.ts';
import {
  renderSidebar,
  initSidebarProfileMenu,
  updateSidebarProfileState,
  closeSidebarProfileMenu,
  destroySidebarProfileMenu,
} from '../components/sidebar/sidebar.ts';
import { requireElement } from '../utils/helpers/dom.ts';
import { bindLinks } from '../utils/helpers/bindLinks.ts';
import { ROUTES, isRoutePath } from './paths.ts';
import type { NavigateOptions, NavigationPath, RoutePath } from './paths.ts';
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
  destroySidebarProfileMenu();
  const sidebar = requireElement<HTMLElement>(document, '#sidebar');
  const hasSidebar = layout === 'sidebar';
  if (hasSidebar) {
    sidebar.innerHTML = renderSidebar();
    initSidebarProfileMenu(navigate);
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

  closeSidebarProfileMenu();
  updateLayout(route.layout || 'plain');
  updateSidebarProfileState(path);
  root.innerHTML = route.render();
  route.init?.(root, navigate);
}

/**
 * Открывает страницу и сохраняет путь с параметрами в истории.
 * @param path
 * @param options
 */
export function navigate(path: NavigationPath, { replace = false }: NavigateOptions = {}): void {
  const url = new URL(path, window.location.href);
  const nextPath = url.pathname + url.search;
  if (nextPath === window.location.pathname + window.location.search) {
    return;
  }
  if (replace) {
    history.replaceState({}, '', nextPath);
  } else {
    history.pushState({}, '', nextPath);
  }
  renderCurrentRoute();
}

/** Запускает роутер и подключает кнопки истории браузера. */
export function initRouter(): void {
  bindLinks(requireElement<HTMLElement>(document, '#app'), navigate);
  window.addEventListener('popstate', renderCurrentRoute);
  renderCurrentRoute();
}
