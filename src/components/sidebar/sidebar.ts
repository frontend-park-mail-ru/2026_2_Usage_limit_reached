import sidebarTemplate from './sidebar.hbs';
import { ProfileMenu } from '../profileMenu/profileMenu.ts';
import { ROUTES } from '../../app/paths.ts';
import type { Navigate } from '../../app/paths.ts';
import { authStore } from '../../modules/auth/auth.store.ts';

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

/**
 * Подключает меню профиля в сайдбаре.
 * @param navigate
 */
export function initSidebarProfileMenu(navigate: Navigate): void {
  profileMenu = new ProfileMenu(navigate);
}

/** Закрывает меню профиля. */
export function closeSidebarProfileMenu(): void {
  profileMenu?.close();
}

/** Снимает обработчики меню профиля и удаляет ссылку на него. */
export function destroySidebarProfileMenu(): void {
  profileMenu?.destroy();
  profileMenu = null;
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

/** Подписывает аватар и меню на store. */
export function initSidebarAvatar(): void {
  updateSidebarMenu();
  unsubscribeAvatar = authStore.subscribe(() => {
    updateSidebarAvatar();
    updateSidebarMenu();
  });
}

/** Отписывает аватар от store. */
export function destroySidebarAvatar(): void {
  unsubscribeAvatar?.();
  unsubscribeAvatar = null;
}

/**
 * Отмечает кнопку профиля, если открыта страница профиля.
 * @param path
 */
export function updateSidebarProfileState(path: string): void {
  const profileButton = document.querySelector('#sidebar .sidebar__item_type_profile');
  if (!profileButton) {
    return;
  }
  if (path === ROUTES.profile) {
    profileButton.setAttribute('aria-current', 'page');
  } else {
    profileButton.removeAttribute('aria-current');
  }
}
