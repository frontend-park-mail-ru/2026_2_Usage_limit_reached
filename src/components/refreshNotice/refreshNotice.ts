import { requireElement } from '../../utils/helpers/dom.ts';
import type { SetRefreshNotice } from './refreshNotice.types.ts';

/** Подключает один индикатор layout, без собственной загрузки данных. */
export function initRefreshNotice(element: HTMLElement) {
  const button = requireElement<HTMLButtonElement>(element, 'button');
  const label = requireElement<HTMLElement>(button, '[data-refresh-label]');
  const area = requireElement<HTMLElement>(document, '.app-layout__notifications');
  const content = requireElement<HTMLElement>(document, '#app');
  const reserveSpace = () => {
    const height = area.getBoundingClientRect().height;
    const bottom = Number.parseFloat(getComputedStyle(area).bottom);
    const page = content.lastElementChild;
    const pagePadding = page ? Number.parseFloat(getComputedStyle(page).paddingBottom) : 0;
    const clearance = height > 0 ? Math.max(0, Math.ceil(height + bottom + 16 - pagePadding)) : 0;
    content.style.setProperty('--notification-clearance', `${clearance}px`);
  };
  const observer = new ResizeObserver(reserveSpace);
  observer.observe(area);
  observer.observe(content);
  let retry: (() => void) | undefined;
  const click = () => {
    if (!button.disabled) {
      retry?.();
    }
  };
  button.addEventListener('click', click);

  const update: SetRefreshNotice = (state, action) => {
    retry = state ? action : undefined;
    element.hidden = state === null;
    button.disabled = state?.pending ?? false;
    label.textContent = state?.pending ? 'Обновляем…' : 'Повторить';
  };

  return {
    update,
    destroy() {
      observer.disconnect();
      content.style.removeProperty('--notification-clearance');
      update(null);
      button.removeEventListener('click', click);
    },
  };
}
