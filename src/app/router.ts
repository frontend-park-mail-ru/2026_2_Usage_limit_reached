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
import { checkSession } from '../modules/auth/auth.actions.ts';
import { authStore } from '../modules/auth/auth.store.ts';
import { ROUTES, isRoutePath } from './paths.ts';
import type { NavigateOptions, NavigationPath, RoutePath } from './paths.ts';
import type { Layout, Route } from './router.types.ts';

const routes: Record<RoutePath, Route> = {
  [ROUTES.home]: { title: 'Главная', render: renderHome, init: initHome },
  [ROUTES.login]: { title: 'Вход', render: renderLogin, init: initLogin },
  [ROUTES.register]: { title: 'Регистрация', render: renderRegister, init: initRegister },
  [ROUTES.profile]: { title: 'Мой профиль', render: renderProfile, init: initProfile, layout: 'sidebar' },
};

const notFoundRoute: Route = { title: 'Страница не найдена', render: renderNotFound };

let currentLayout: Layout | undefined;

/** Выбирает адрес перенаправления по состоянию сессии. */
function getAuthRedirect(path: string): RoutePath | undefined {
  const { status } = authStore.getState();
  const isAuthPage = path === ROUTES.login || path === ROUTES.register;
  if (status === 'authenticated' && (path === ROUTES.home || isAuthPage)) {
    return ROUTES.profile;
  } else if (status === 'guest' && (path === ROUTES.home || path === ROUTES.profile)) {
    return ROUTES.login;
  }
  return undefined;
}

/** Заменяет текущий адрес, если состояние сессии требует другую страницу. */
function redirectByAuth(): boolean {
  const target = getAuthRedirect(window.location.pathname);
  if (!target) {
    return false;
  }
  navigate(target, { replace: true });
  return true;
}

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
  if (redirectByAuth()) {
    return;
  }
  const path = window.location.pathname;
  const route = isRoutePath(path) ? routes[path] : notFoundRoute;
  const root = requireElement<HTMLElement>(document, '#app');

  closeSidebarProfileMenu();
  updateLayout(route.layout || 'plain');
  updateSidebarProfileState(path);
  document.title = route.title;
  root.innerHTML = route.render();
  route.init?.(root);
}

/**
 * Открывает страницу и сохраняет путь с параметрами в истории.
 * @param path
 * @param options
 */
export function navigate(path: NavigationPath, { replace = false }: NavigateOptions = {}): void {
  const url = new URL(path, window.location.href);
  const redirect = getAuthRedirect(url.pathname);
  const nextPath = redirect ?? url.pathname + url.search;
  if (nextPath === window.location.pathname + window.location.search) {
    return;
  }
  if (replace || redirect) {
    history.replaceState({}, '', nextPath);
  } else {
    history.pushState({}, '', nextPath);
  }
  renderCurrentRoute();
}

/** Запускает роутер и возвращает функцию отключения его обработчиков. */
export function initRouter(): () => void {
  let active = true;
  const unbindLinks = bindLinks(requireElement<HTMLElement>(document, '#app'), navigate);
  const unsubscribeAuth = authStore.subscribe(() => {
    // Сначала завершаем действие Flux, затем выполняем переход.
    queueMicrotask(() => {
      if (active) {
        redirectByAuth();
      }
    });
  });
  window.addEventListener('popstate', renderCurrentRoute);
  renderCurrentRoute();

  const path = window.location.pathname;
  if (authStore.getState().status === 'unknown' && (path === ROUTES.login || path === ROUTES.register)) {
    // Если проверка недоступна, форма остаётся открытой.
    void checkSession().catch(() => {});
  }

  return () => {
    active = false;
    unbindLinks();
    unsubscribeAuth();
    window.removeEventListener('popstate', renderCurrentRoute);
    destroySidebarProfileMenu();
    currentLayout = undefined;
  };
}
