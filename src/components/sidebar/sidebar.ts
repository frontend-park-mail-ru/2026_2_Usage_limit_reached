import sidebarTemplate from './sidebar.hbs';
import { ProfileMenu } from '../profileMenu/profileMenu.ts';
import { ROUTES } from '../../app/paths.ts';
import type { Navigate } from '../../app/paths.ts';

let profileMenu: ProfileMenu | null = null;

/** Возвращает HTML сайдбара. */
export function renderSidebar(): string {
  return sidebarTemplate();
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

/**
 * Отмечает кнопку профиля, если открыта страница профиля.
 * @param path
 */
export function updateSidebarProfileState(path: string): void {
  const profileButton = document.querySelector('#sidebar .sidebar__item--profile');
  if (!profileButton) {
    return;
  }
  if (path === ROUTES.profile) {
    profileButton.setAttribute('aria-current', 'page');
  } else {
    profileButton.removeAttribute('aria-current');
  }
}
