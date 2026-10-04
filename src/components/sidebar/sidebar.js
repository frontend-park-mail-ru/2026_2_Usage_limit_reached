import { render } from '../../app/view.js';
import { bindLinks } from '../../utils/helpers/bindLinks.js';

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
  bindLinks(document.getElementById('sidebar'), navigate);
}

/**
 * Отмечает текущую страницу в сайдбаре.
 * @param {string} path - Путь страницы.
 * @returns {void}
 */
export function setActiveSidebarLink(path) {
  const profileLink = document.querySelector('#sidebar a[data-link]');
  if (!profileLink) return;
  if (path === '/profile') {
    profileLink.setAttribute('aria-current', 'page');
  } else {
    profileLink.removeAttribute('aria-current');
  }
}
