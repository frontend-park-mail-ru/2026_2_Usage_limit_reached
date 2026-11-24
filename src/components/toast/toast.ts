import { requireElement } from '@/utils/helpers/dom.ts';
import { TOAST_DURATION } from './toast.constants.ts';

let hideTimer: number | undefined;

/**
 * Показывает уведомление.
 * @param text
 * @param kind
 */
export function showToast(text: string, kind: 'success' | 'error' = 'success'): void {
  const toast = requireElement<HTMLElement>(document, '#toast');
  toast.dataset.kind = kind;
  toast.textContent = text;
  window.clearTimeout(hideTimer);
  hideTimer = window.setTimeout(() => {
    toast.textContent = '';
  }, TOAST_DURATION);
}
