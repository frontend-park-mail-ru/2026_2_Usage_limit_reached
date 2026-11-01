import { render } from '../../app/view.ts';
import { ROUTES } from '../../app/paths.ts';

/** Возвращает HTML страницы 404. */
export function renderNotFound(): string {
  return render('pages/notFound/notFound', { homePath: ROUTES.home });
}
