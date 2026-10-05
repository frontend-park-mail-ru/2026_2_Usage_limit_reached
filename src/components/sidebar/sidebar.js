import { render } from '../../app/view.js';
import { initProfileMenu } from '../profileMenu/profileMenu.js';

let profileMenu;

/**
 * Возвращает HTML сайдбара.
 * @returns {string} HTML сайдбара.
 */
export function renderSidebar() {
  return render('components/sidebar/sidebar');
}

/**
 * Подключает ссылки сайдбара.
 * @param {(path: string) => void} navigate - Функция перехода.
 * @returns {void}
 */
export function bindSidebarLinks(navigate) {
  const container = document.getElementById('sidebar');
  profileMenu = initProfileMenu(
    container.querySelector('.profile-menu'),
    container.querySelector('.sidebar__item--profile'),
    navigate,
  );
}

/**
 * Закрывает меню профиля.
 * @returns {void}
 */
export function closeSidebarMenu() {
  profileMenu?.close();
}

/**
 * Снимает обработчики меню сайдбара.
 * @returns {void}
 */
export function destroySidebar() {
  profileMenu?.destroy();
  profileMenu = null;
}

/**
 * Отмечает текущую страницу в сайдбаре.
 * @param {string} path - Путь страницы.
 * @returns {void}
 */
export function setActiveSidebarLink(path) {
  const profileButton = document.querySelector('#sidebar .sidebar__item--profile');
  if (!profileButton) return;
  if (path === '/profile') {
    profileButton.setAttribute('aria-current', 'page');
  } else {
    profileButton.removeAttribute('aria-current');
  }
}
