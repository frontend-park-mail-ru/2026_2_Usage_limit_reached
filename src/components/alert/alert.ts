import { requireElement } from '@/utils/helpers/dom.ts';

/**
 * Показывает плашку ошибки или прячет её при text = null.
 * @param alert
 * @param text
 * @param title
 */
export function setAlert(alert: HTMLElement, text: string | null, title?: string): void {
  requireElement(alert, '[data-alert-text]').textContent = text ?? '';
  if (title) {
    requireElement(alert, '[data-alert-title]').textContent = title;
  }
  alert.hidden = !text;
}
