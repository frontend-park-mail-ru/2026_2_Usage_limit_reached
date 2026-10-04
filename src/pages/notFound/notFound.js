import { render } from '../../app/view.js';

/**
 * Возвращает HTML страницы для неизвестного маршрута.
 * @returns {string} HTML страницы 404.
 */
export function renderNotFound() {
  return render('pages/notFound/notFound');
}
