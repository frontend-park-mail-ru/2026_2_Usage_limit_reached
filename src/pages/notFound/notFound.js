import { render } from '../../app/view.js';

/**
 * Возвращает HTML страницы 404.
 * @returns {string} HTML страницы 404.
 */
export function renderNotFound() {
  return render('pages/notFound/notFound');
}
