import sidebarTemplate from './sidebar.hbs';
import { ProfileMenu } from '@/components/profileMenu/profileMenu.ts';
import { ROUTES } from '@/app/paths.ts';
import type { Navigate } from '@/app/paths.ts';
import { authStore } from '@/modules/auth/auth.store.ts';
import { bindLinks } from '@/utils/helpers/bindLinks.ts';
import { requireElement } from '@/utils/helpers/dom.ts';

let profileMenu: ProfileMenu | null = null;
let unsubscribeAvatar: (() => void) | null = null;
let unbindLogo: (() => void) | undefined;
let hintController: AbortController | undefined;

/** Аватар из store. */
function getAvatarUrl(): string | undefined {
  return authStore.getState().user?.avatar_url;
}

/** Возвращает HTML сайдбара. */
export function renderSidebar(): string {
  return sidebarTemplate({ avatarUrl: getAvatarUrl() });
}

/** Закрывает меню профиля. */
export function closeSidebarProfileMenu(): void {
  profileMenu?.close();
  profileMenu?.closeLogoutConfirmation();
}

/** Показывает аватар или иконку. */
function updateSidebarAvatar(): void {
  const icon = document.querySelector<HTMLElement>('#sidebar .sidebar__profile-icon');
  const avatar = document.querySelector<HTMLImageElement>('#sidebar .sidebar__avatar');
  if (!icon || !avatar) {
    return;
  }
  const url = getAvatarUrl();
  if (url) {
    avatar.src = url;
  } else {
    avatar.removeAttribute('src');
  }
  avatar.hidden = !url;
  icon.hidden = !!url;
}

/** Показывает пункты меню для гостя или для вошедшего. */
function updateSidebarMenu(): void {
  const isGuest = authStore.getState().status === 'guest';
  document.querySelectorAll<HTMLElement>('#sidebar [data-auth]').forEach((item) => {
    item.hidden = (item.dataset.auth === 'guest') !== isGuest;
  });
}

/**
 * Подключает меню профиля и аватар.
 * @param navigate
 */
export function initSidebar(navigate: Navigate): void {
  hintController = new AbortController();
  const { signal } = hintController;
  const hideHints = () => document.querySelectorAll<HTMLElement>('.sidebar__hint').forEach((hint) => {
    hint.hidden = true;
  });
  document.querySelectorAll<HTMLElement>('.sidebar__unavailable').forEach((item) => {
    const hint = requireElement<HTMLElement>(item, '.sidebar__hint');
    const showHint = () => {
      hideHints();
      const rect = item.getBoundingClientRect();
      hint.style.left = `${requireElement<HTMLElement>(document, '.sidebar').getBoundingClientRect().right + 8}px`;
      hint.hidden = false;
      hint.style.top = `${Math.max(8, Math.min(rect.top + (rect.height - hint.offsetHeight) / 2, window.innerHeight - hint.offsetHeight - 8))}px`;
    };
    item.addEventListener('mouseenter', showHint, { signal });
    item.addEventListener('focusin', showHint, { signal });
    item.addEventListener('mouseleave', hideHints, { signal });
    item.addEventListener('focusout', hideHints, { signal });
  });
  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') {
      hideHints();
    }
  }, { signal });
  window.addEventListener('resize', hideHints, { signal });
  document.addEventListener('scroll', hideHints, { signal, capture: true });
  profileMenu = new ProfileMenu(navigate);
  unbindLogo = bindLinks(requireElement<HTMLElement>(document, '.sidebar__top'), navigate);
  updateSidebarMenu();
  unsubscribeAvatar = authStore.subscribe(() => {
    updateSidebarAvatar();
    updateSidebarMenu();
  });
}

/** Снимает обработчики сайдбара. */
export function destroySidebar(): void {
  hintController?.abort();
  hintController = undefined;
  unbindLogo?.();
  unbindLogo = undefined;
  profileMenu?.destroy();
  profileMenu = null;
  unsubscribeAvatar?.();
  unsubscribeAvatar = null;
}

/**
 * Отмечает кнопку профиля, если открыта страница профиля.
 * @param path
 */
export function updateSidebarProfileState(path: string): void {
  const logo = document.querySelector('.sidebar__logo-link');
  if (path === ROUTES.home || path === ROUTES.feed) {
    logo?.setAttribute('aria-current', 'page');
  } else {
    logo?.removeAttribute('aria-current');
  }
  const profileButton = document.querySelector('.sidebar__item-profile');
  if (!profileButton) {
    return;
  }
  if (path === ROUTES.profile) {
    profileButton.setAttribute('aria-current', 'page');
  } else {
    profileButton.removeAttribute('aria-current');
  }
}
