import { render } from '../../app/view.js';
import { initProfileMenu } from '../profileMenu/profileMenu.js';
import type { ProfileMenu } from '../profileMenu/profileMenu.js';
import { ROUTES } from '../../app/paths.js';
import type { Navigate } from '../../app/paths.js';

let profileMenu: ProfileMenu | null = null;

export function renderSidebar(): string {
  return render('components/sidebar/sidebar');
}

export function bindSidebarLinks(navigate: Navigate): void {
  const container = document.getElementById('sidebar');
  const menu = container?.querySelector<HTMLElement>('.profile-menu');
  const button = container?.querySelector<HTMLButtonElement>('.sidebar__item--profile');
  if (!menu || !button) return;
  profileMenu = initProfileMenu(menu, button, navigate);
}

export function closeSidebarMenu(): void {
  profileMenu?.close();
}

export function destroySidebar(): void {
  profileMenu?.destroy();
  profileMenu = null;
}

export function setActiveSidebarLink(path: string): void {
  const profileButton = document.querySelector('#sidebar .sidebar__item--profile');
  if (!profileButton) return;
  if (path === ROUTES.profile) {
    profileButton.setAttribute('aria-current', 'page');
  } else {
    profileButton.removeAttribute('aria-current');
  }
}
