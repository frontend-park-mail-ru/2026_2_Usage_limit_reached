import notFoundTemplate from './notFound.hbs';
import { ROUTES } from '../../app/paths.ts';

/** Возвращает HTML страницы 404. */
export function renderNotFound(): string {
  return notFoundTemplate({ homePath: ROUTES.home });
}
