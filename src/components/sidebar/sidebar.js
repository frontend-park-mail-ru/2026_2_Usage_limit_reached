import { render } from '../../app/view.js';
import { bindLinks } from '../../app/linkClick.js';

/**
 * Возвращает общий сайдбар профиля без логики будущих разделов.
 * @returns {string} HTML навигации.
 */
export function renderSidebar() {
  return render('components/sidebar/sidebar');
}

/**
 * Подключает переходы только к ссылкам нового экземпляра сайдбара.
 * Вызывается после его рендера при смене layout.
 * @param {(path: string) => void} navigate - Функция перехода из роутера.
 * @returns {void}
 */
export function bindSidebarLinks(navigate) {
  bindLinks(document.getElementById('sidebar'), navigate);
}
