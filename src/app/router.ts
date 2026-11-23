import { cancelLoading } from '@/utils/helpers/delayedLoading.ts';
import { renderLogin, initLogin } from '@/pages/login/login.ts';
import { renderFeed, initFeed } from '@/pages/feed/feed.ts';
import { renderSearch, initSearch } from '@/pages/search/search.ts';
import { renderRegister, initRegister } from '@/pages/register/register.ts';
import { renderProfile, initProfile } from '@/pages/profile/profile.ts';
import { renderBecomeAuthor, initBecomeAuthor } from '@/pages/becomeAuthor/becomeAuthor.ts';
import { renderPublicProfile, initPublicProfile } from '@/pages/profile/publicProfile.ts';
import { renderSettings, initSettings } from '@/pages/settings/settings.ts';
import { renderAuthorTiers, initAuthorTiers } from '@/pages/authorTiers/authorTiers.ts';
import { renderNewTier, initNewTier, renderEditTier, initEditTier } from '@/pages/authorTiers/newTier.ts';
import { renderPostEditor, initPostEditor } from '@/pages/postEditor/postEditor.ts';
import { renderPost, initPost } from '@/pages/post/post.ts';
import { renderDonations, initDonations } from '@/pages/donations/donations.ts';
import { renderNotFound } from '@/pages/notFound/notFound.ts';
import {
  renderSidebar,
  initSidebar,
  destroySidebar,
  updateSidebarCurrentPage,
  closeSidebarProfileMenu,
} from '@/components/sidebar/sidebar.ts';
import { requireElement } from '@/utils/helpers/dom.ts';
import { bindLinks } from '@/utils/helpers/bindLinks.ts';
import { checkSession } from '@/modules/auth/auth.actions.ts';
import { authStore } from '@/modules/auth/auth.store.ts';
import type { SetRefreshNotice } from '@/components/refreshNotice/refreshNotice.types.ts';
import { ROUTES, matchRoute } from './paths.ts';
import type { NavigateOptions, NavigationPath, RoutePath, RoutePattern } from './paths.ts';
import type { Layout, LeaveGuard, Route } from './router.types.ts';

const feedRoute: Route = { title: 'Лента', render: renderFeed, init: initFeed, layout: 'sidebar' };

const routes: Record<RoutePattern, Route> = {
  [ROUTES.home]: feedRoute,
  [ROUTES.feed]: feedRoute,
  [ROUTES.search]: { title: 'Поиск авторов', render: renderSearch, init: initSearch, layout: 'sidebar' },
  [ROUTES.login]: { title: 'Вход', render: renderLogin, init: initLogin },
  [ROUTES.register]: { title: 'Регистрация', render: renderRegister, init: initRegister },
  [ROUTES.profile]: { title: 'Мой профиль', render: renderProfile, init: initProfile, layout: 'sidebar' },
  [ROUTES.becomeAuthor]: { title: 'Стать автором', render: renderBecomeAuthor, init: initBecomeAuthor, layout: 'sidebar' },
  [ROUTES.publicProfile]: { title: 'Профиль', render: renderPublicProfile, init: initPublicProfile, layout: 'sidebar' },
  [ROUTES.settings]: { title: 'Настройки профиля', render: renderSettings, init: initSettings, layout: 'sidebar' },
  [ROUTES.settingsTiers]: { title: 'Уровни подписки', render: renderAuthorTiers, init: initAuthorTiers, layout: 'sidebar' },
  [ROUTES.settingsTierNew]: { title: 'Новый уровень', render: renderNewTier, init: initNewTier, layout: 'sidebar' },
  [ROUTES.settingsTierEdit]: { title: 'Редактировать уровень', render: renderEditTier, init: initEditTier, layout: 'sidebar' },
  [ROUTES.donations]: { title: 'Пожертвования', render: renderDonations, init: initDonations, layout: 'sidebar' },
  [ROUTES.postNew]: { title: 'Новый пост', render: renderPostEditor, init: initPostEditor, layout: 'sidebar' },
  [ROUTES.post]: { title: 'Публикация', render: renderPost, init: initPost, layout: 'sidebar' },
  [ROUTES.postEdit]: { title: 'Редактирование поста', render: renderPostEditor, init: initPostEditor, layout: 'sidebar' },
};

const notFoundRoute: Route = { title: 'Страница не найдена', render: renderNotFound };

const PRIVATE_ROUTES: readonly RoutePattern[] = [
  ROUTES.profile, ROUTES.becomeAuthor, ROUTES.settings, ROUTES.settingsTiers, ROUTES.donations, ROUTES.postNew, ROUTES.postEdit,
  ROUTES.settingsTierNew, ROUTES.settingsTierEdit,
];

const MOBILE_PLAIN_ROUTES: readonly RoutePattern[] = [
  ROUTES.postNew, ROUTES.postEdit, ROUTES.settingsTiers, ROUTES.settingsTierNew, ROUTES.settingsTierEdit,
];

let currentLayout: Layout | undefined;
let disposePage: (() => void) | undefined;
let setRefreshNotice: SetRefreshNotice | undefined;
let pageVersion = 0;
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
  if (status === 'authenticated' && isAuthPage) {
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
 * Обновляет раскладку и сайдбар.
 * @param layout
 * @param pattern
 * @param destroyBeforeUpdate
 * @param initBeforeUpdate
 */
function updateLayout(
  layout: Layout,
  pattern: RoutePattern | undefined,
  destroyBeforeUpdate: () => void,
  initBeforeUpdate: () => void,
): void {
  const layoutRoot = requireElement(document, '#layout');
  const hasSidebar = layout === 'sidebar';
  const mobilePlain = hasSidebar && pattern !== undefined && MOBILE_PLAIN_ROUTES.includes(pattern);
  layoutRoot.classList.toggle('app-layout-wrapper_mobile-nav', hasSidebar && !mobilePlain);
  layoutRoot.classList.toggle('app-layout-wrapper_mobile-plain', mobilePlain);

  if (currentLayout === layout) {
    return;
  }
  destroyBeforeUpdate();
  const sidebar = requireElement<HTMLElement>(document, '#sidebar');
  if (hasSidebar) {
    sidebar.innerHTML = renderSidebar();
    initBeforeUpdate();
  } else {
    sidebar.innerHTML = '';
  }
  sidebar.hidden = !hasSidebar;
  layoutRoot.classList.toggle('app-layout-wrapper', hasSidebar);
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

  cancelLoading(root);
  disposePage?.();
  disposePage = undefined;
  const version = ++pageVersion;
  setRefreshNotice?.(null);
  closeSidebarProfileMenu();
  updateLayout(route.layout || 'plain', match?.pattern, destroySidebar, () => initSidebar(navigate));
  updateSidebarCurrentPage(path);
  document.title = route.title;
  root.innerHTML = route.render();
  const cleanup = route.init?.(
    root,
    navigate,
    match?.params ?? {},
    (state, retry) => {
      if (version === pageVersion) {
        setRefreshNotice?.(state, retry);
      }
    }
  );
  if (typeof cleanup === 'function') {
    disposePage = cleanup;
  }
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
export function initRouter(updateRefreshNotice: SetRefreshNotice): () => void {
  let active = true;
  setRefreshNotice = updateRefreshNotice;
  const unbindLinks = bindLinks(requireElement<HTMLElement>(document, '#app'), navigate);
  let { status: lastStatus, user: lastUser } = authStore.getState();
  const unsubscribeAuth = authStore.subscribe(() => {
    const { status, user } = authStore.getState();
    const isLoggedOut = lastStatus === 'authenticated' && status === 'guest';
    const changedAccount = lastStatus === 'authenticated' && status === 'authenticated' && lastUser?.id !== user?.id;
    lastStatus = status;
    lastUser = user;
    if (!active) {
      return;
    }
    if (isLoggedOut) {
      navigate(ROUTES.login, { replace: true, force: true });
    } else if ((status === 'unknown' && [ROUTES.profile, ROUTES.settings].some((path) => path === window.location.pathname))
      || ((status === 'unknown' || changedAccount)
        && [ROUTES.settingsTiers, ROUTES.settingsTierNew, ROUTES.settingsTierEdit]
          .some((pattern) => pattern === matchRoute(window.location.pathname)?.pattern))) {
      renderCurrentRoute();
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
    cancelLoading(requireElement<HTMLElement>(document, '#app'));
    disposePage?.();
    disposePage = undefined;
    pageVersion += 1;
    setRefreshNotice = undefined;
    unbindLinks();
    unsubscribeAuth();
    window.removeEventListener('popstate', handlePopState);
    window.removeEventListener('beforeunload', handleBeforeUnload);
    leaveGuard = undefined;
    destroySidebar();
    currentLayout = undefined;
  };
}
