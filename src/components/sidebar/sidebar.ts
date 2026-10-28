import sidebarTemplate from './sidebar.hbs';
import { initProfileMenu } from '../profileMenu/profileMenu.ts';
import type { ProfileMenu } from '../profileMenu/profileMenu.types.ts';
import { ROUTES } from '../../app/paths.ts';
import type { Navigate } from '../../app/paths.ts';

let profileMenu: ProfileMenu | null = null;

export function renderSidebar(): string {
  return sidebarTemplate();
}

/**
 * @param navigate
 */
export function bindSidebarLinks(navigate: Navigate): void {
  const container = document.getElementById('sidebar');
  const menu = container?.querySelector<HTMLElement>('.profile-menu');
  const button = container?.querySelector<HTMLButtonElement>('.sidebar__item--profile');
  if (!menu || !button) {
    return;
  }
  profileMenu = initProfileMenu(menu, button, navigate);
}

export function closeSidebarMenu(): void {
  profileMenu?.close();
}

export function destroySidebar(): void {
  profileMenu?.destroy();
  profileMenu = null;
}

/**
 * @param path
 */
export function setActiveSidebarLink(path: string): void {
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
