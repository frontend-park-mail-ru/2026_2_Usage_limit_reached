import { render } from '../../app/view.ts';

/** Возвращает HTML страницы 404. */
export function renderNotFound(): string {
  return render('pages/notFound/notFound');
}
