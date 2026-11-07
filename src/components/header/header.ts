import headerTemplate from './header.hbs';
import { bindLinks } from '../../utils/helpers/bindLinks.ts';
import type { Navigate } from '../../app/paths.ts';

export function renderHeader(): string {
  return headerTemplate();
}

/**
 * Подключает переходы по ссылкам шапки через роутер.
 * @param navigate
 */
export function bindHeaderLinks(navigate: Navigate): void {
  const header = document.querySelector<HTMLElement>('.header');
  if (header) {
    bindLinks(header, navigate);
  }
}
