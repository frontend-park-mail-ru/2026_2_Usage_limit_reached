import { requireElement } from '@/utils/helpers/dom.ts';
import { TOAST_DURATION } from './toast.constants.ts';

let hideTimer: number | undefined;

/**
 * Показывает уведомление.
 * @param text
 */
export function showToast(text: string): void {
  const toast = requireElement<HTMLElement>(document, '#toast');
  toast.textContent = text;
  window.clearTimeout(hideTimer);
  hideTimer = window.setTimeout(() => {
    toast.textContent = '';
  }, TOAST_DURATION);
}
