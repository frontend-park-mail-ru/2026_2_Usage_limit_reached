import sidebarTemplate from './sidebar.hbs';
import { ProfileMenu } from '@/components/profileMenu/profileMenu.ts';
import { ROUTES } from '@/app/paths.ts';
import type { Navigate } from '@/app/paths.ts';
import { authStore } from '@/modules/auth/auth.store.ts';

let profileMenu: ProfileMenu | null = null;
let unsubscribeAvatar: (() => void) | null = null;

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
  profileMenu = new ProfileMenu(navigate);
  updateSidebarMenu();
  unsubscribeAvatar = authStore.subscribe(() => {
    updateSidebarAvatar();
    updateSidebarMenu();
  });
}

/** Снимает обработчики сайдбара. */
export function destroySidebar(): void {
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
