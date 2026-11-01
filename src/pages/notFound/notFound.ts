import notFoundTemplate from './notFound.hbs';

/** Возвращает HTML страницы 404. */
export function renderNotFound(): string {
  return notFoundTemplate();
}
