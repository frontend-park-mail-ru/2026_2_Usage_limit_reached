import { render } from '../../app/view.ts';
import { bindLinks } from '../../utils/helpers/bindLinks.ts';
import type { Navigate } from '../../app/paths.ts';

export function renderHeader(): string {
  return render('components/header/header');
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
