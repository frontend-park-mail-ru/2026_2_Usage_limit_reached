import { renderLogin, initLogin } from '../pages/login/login.ts';
import { renderHome, initHome } from '../pages/home/home.ts';
import { renderRegister, initRegister } from '../pages/register/register.ts';
import { renderProfile, initProfile } from '../pages/profile/profile.ts';
import { renderSettings, initSettings } from '../pages/settings/settings.ts';
import { renderPostEditor, initPostEditor } from '../pages/postEditor/postEditor.ts';
import { renderPost, initPost } from '../pages/post/post.ts';
import { renderDonations, initDonations } from '../pages/donations/donations.ts';
import { renderNotFound } from '../pages/notFound/notFound.ts';
import {
  renderSidebar,
  initSidebarProfileMenu,
  updateSidebarProfileState,
  closeSidebarProfileMenu,
  destroySidebarProfileMenu,
  initSidebarAvatar,
  destroySidebarAvatar,
} from '../components/sidebar/sidebar.ts';
import { requireElement } from '../utils/helpers/dom.ts';
import { bindLinks } from '../utils/helpers/bindLinks.ts';
import { checkSession } from '../modules/auth/auth.actions.ts';
import { authStore } from '../modules/auth/auth.store.ts';
import { ROUTES, matchRoute } from './paths.ts';
import type { NavigateOptions, NavigationPath, RoutePath, RoutePattern } from './paths.ts';
import type { Layout, LeaveGuard, Route } from './router.types.ts';

const routes: Record<RoutePattern, Route> = {
  [ROUTES.home]: { title: 'Главная', render: renderHome, init: initHome },
  [ROUTES.login]: { title: 'Вход', render: renderLogin, init: initLogin },
  [ROUTES.register]: { title: 'Регистрация', render: renderRegister, init: initRegister },
  [ROUTES.profile]: { title: 'Мой профиль', render: renderProfile, init: initProfile, layout: 'sidebar' },
  [ROUTES.settings]: { title: 'Настройки профиля', render: renderSettings, init: initSettings, layout: 'sidebar' },
  [ROUTES.donations]: { title: 'Пожертвования', render: renderDonations, init: initDonations, layout: 'sidebar' },
  [ROUTES.postNew]: { title: 'Создание поста', render: renderPostEditor, init: initPostEditor, layout: 'sidebar' },
  [ROUTES.post]: { title: 'Публикация', render: renderPost, init: initPost, layout: 'sidebar' },
  [ROUTES.postEdit]: { title: 'Редактирование поста', render: renderPostEditor, init: initPostEditor, layout: 'sidebar' },
};

const notFoundRoute: Route = { title: 'Страница не найдена', render: renderNotFound };

const PRIVATE_ROUTES: readonly RoutePattern[] = [ROUTES.home, ROUTES.profile, ROUTES.settings, ROUTES.donations, ROUTES.postNew, ROUTES.postEdit];

let currentLayout: Layout | undefined;
let currentPath = '';
let leaveGuard: LeaveGuard | undefined;

/**
 * Включает проверку ухода со страницы до следующего перехода.
 * @param guard
 */
export function setLeaveGuard(guard: LeaveGuard): void {
  leaveGuard = guard;
}

/** Выбирает адрес перенаправления по состоянию сессии. */
function getAuthRedirect(path: string): RoutePath | undefined {
  const { status } = authStore.getState();
  const isAuthPage = path === ROUTES.login || path === ROUTES.register;
  if (status === 'authenticated' && (path === ROUTES.home || isAuthPage)) {
    return ROUTES.profile;
  }
  const pattern = matchRoute(path)?.pattern;
  if (status === 'guest' && pattern && PRIVATE_ROUTES.includes(pattern)) {
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
  navigate(target, { replace: true, force: true });
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
  destroySidebarAvatar();
  const sidebar = requireElement<HTMLElement>(document, '#sidebar');
  const hasSidebar = layout === 'sidebar';
  if (hasSidebar) {
    sidebar.innerHTML = renderSidebar();
    initSidebarProfileMenu(navigate);
    initSidebarAvatar();
  } else {
    sidebar.innerHTML = '';
  }
  sidebar.hidden = !hasSidebar;
  requireElement(document, '#layout').classList.toggle('app-layout-wrapper', hasSidebar);
  currentLayout = layout;
}

/** Показывает страницу по текущему адресу. */
function renderCurrentRoute(): void {
  if (redirectByAuth()) {
    return;
  }
  const path = window.location.pathname;
  const match = matchRoute(path);
  const route = match ? routes[match.pattern] : notFoundRoute;
  const root = requireElement<HTMLElement>(document, '#app');
  leaveGuard = undefined;
  currentPath = path + window.location.search;

  closeSidebarProfileMenu();
  updateLayout(route.layout || 'plain');
  updateSidebarProfileState(path);
  document.title = route.title;
  root.innerHTML = route.render();
  route.init?.(root, navigate, match?.params ?? {});
}

/**
 * Открывает страницу и сохраняет путь с параметрами в истории.
 * @param path
 * @param options
 */
export function navigate(path: NavigationPath, { replace = false, force = false }: NavigateOptions = {}): void {
  const url = new URL(path, window.location.href);
  const redirect = getAuthRedirect(url.pathname);
  const nextPath = redirect ?? url.pathname + url.search;
  if (nextPath === window.location.pathname + window.location.search) {
    return;
  }
  const guard = leaveGuard;
  if (!force && guard?.hasChanges()) {
    guard.confirm(() => navigate(path, { replace, force: true }));
    return;
  }
  if (replace || redirect) {
    history.replaceState(history.state, '', nextPath);
  } else {
    history.pushState({ from: currentPath }, '', nextPath);
  }
  renderCurrentRoute();
}

/** Обрабатывает кнопки «назад» и «вперёд» браузера. */
function handlePopState(): void {
  const guard = leaveGuard;
  if (!guard?.hasChanges()) {
    renderCurrentRoute();
    return;
  }
  const target = (window.location.pathname + window.location.search) as NavigationPath;
  history.pushState({}, '', currentPath);
  guard.confirm(() => navigate(target, { force: true }));
}

/**
 * Просит браузер подтвердить закрытие вкладки с несохранёнными изменениями.
 * @param event
 */
function handleBeforeUnload(event: BeforeUnloadEvent): void {
  if (leaveGuard?.hasChanges()) {
    event.preventDefault();
  }
}

/** Запускает роутер и возвращает функцию отключения его обработчиков. */
export function initRouter(): () => void {
  let active = true;
  const unbindLinks = bindLinks(requireElement<HTMLElement>(document, '#app'), navigate);
  let lastStatus = authStore.getState().status;
  const unsubscribeAuth = authStore.subscribe(() => {
    const { status } = authStore.getState();
    const isLoggedOut = lastStatus === 'authenticated' && status === 'guest';
    lastStatus = status;
    if (!active) {
      return;
    }
    if (isLoggedOut) {
      navigate(ROUTES.login, { replace: true, force: true });
    } else {
      redirectByAuth();
    }
  });
  window.addEventListener('popstate', handlePopState);
  window.addEventListener('beforeunload', handleBeforeUnload);
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
    window.removeEventListener('popstate', handlePopState);
    window.removeEventListener('beforeunload', handleBeforeUnload);
    leaveGuard = undefined;
    destroySidebarProfileMenu();
    destroySidebarAvatar();
    currentLayout = undefined;
  };
}
