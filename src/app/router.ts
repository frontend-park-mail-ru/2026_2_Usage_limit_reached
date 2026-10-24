import { renderLogin, initLogin } from '../pages/login/login.js';
import { renderHome, initHome } from '../pages/home/home.js';
import { renderRegister, initRegister } from '../pages/register/register.js';
import { renderProfile, initProfile } from '../pages/profile/profile.js';
import { renderNotFound } from '../pages/notFound/notFound.js';
import { renderSidebar, bindSidebarLinks, setActiveSidebarLink, closeSidebarMenu, destroySidebar } from '../components/sidebar/sidebar.js';
import { requireElement } from '../utils/helpers/dom.js';

type Layout = 'plain' | 'sidebar';

type NavigateOptions = {
  replace?: boolean;
};

type Route = {
  render: () => string;
  init?: (root: HTMLElement, navigate: (path: string, options?: NavigateOptions) => void) => void;
  layout?: Layout;
};

const routes: Record<string, Route> = {
  '/': { render: renderHome, init: initHome },
  '/login': { render: renderLogin, init: initLogin },
  '/register': { render: renderRegister, init: initRegister },
  '/profile': { render: renderProfile, init: initProfile, layout: 'sidebar' },
};

const notFoundRoute: Route = { render: renderNotFound };

let currentLayout: Layout | undefined;

function updateLayout(layout: Layout): void {
  if (currentLayout === layout) return;
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

function renderCurrentRoute(): void {
  const path = window.location.pathname;
  const route = routes[path] || notFoundRoute;
  const root = requireElement<HTMLElement>(document, '#app');

  closeSidebarMenu();
  updateLayout(route.layout || 'plain');
  setActiveSidebarLink(path);
  root.innerHTML = route.render();
  route.init?.(root, navigate);
}

export function navigate(path: string, { replace = false }: NavigateOptions = {}): void {
  const url = new URL(path, window.location.href);
  if (url.pathname + url.search === window.location.pathname + window.location.search) return;
  if (replace) history.replaceState({}, '', path);
  else history.pushState({}, '', path);
  renderCurrentRoute();
}

export function initRouter(): void {
  window.addEventListener('popstate', renderCurrentRoute);
  renderCurrentRoute();
}
