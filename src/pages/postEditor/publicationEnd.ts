import { requireElement } from '@/utils/helpers/dom.ts';
import { toLocalMinute } from './postDate.ts';

const dateLabel = new Intl.DateTimeFormat('ru-RU', { day: 'numeric', month: 'long' });

/** Подключает поля и проверку даты завершения публикации. */
export function bindPublicationEnd(form: HTMLFormElement, savedEnd: string | null, signal: AbortSignal) {
  const panel = requireElement(form, '[data-publication-end]');
  const details = requireElement<HTMLDetailsElement>(panel, 'details');
  const summary = requireElement<HTMLElement>(details, 'summary');
  const date = requireElement<HTMLInputElement>(details, 'input[type="date"]');
  const time = requireElement<HTMLInputElement>(details, 'input[type="time"]');
  const error = requireElement(details, '[data-publication-end-error]');
  const parsedDate = () => {
    const parsed = new Date(`${date.value}T12:00`);
    return /^\d{4}-\d{2}-\d{2}$/.test(date.value) && Number.isFinite(parsed.getTime()) ? parsed : null;
  };
  const invalidDate = 'Укажите дату с четырёхзначным годом';
  const validate = () => {
    const invalid = date.value && !parsedDate();
    const field = invalid || (time.value && !date.value) ? date : date.value && !time.value ? time : null;
    if (!field) {
      return true;
    }
    details.open = true;
    error.textContent = invalid ? invalidDate : field === time ? 'Укажите время завершения' : 'Укажите дату завершения';
    field.focus();
    return false;
  };
  const updateSummary = () => {
    const parsed = parsedDate();
    summary.textContent = parsed && time.value
      ? `${dateLabel.format(parsed)} ${date.value.slice(0, 4)}, ${time.value}`
      : 'Указать дату и время';
  };
  const savedDate = savedEnd ? new Date(savedEnd) : null;
  if (savedDate && Number.isFinite(+savedDate)) {
    [date.value, time.value] = toLocalMinute(savedDate).split('T');
    updateSummary();
  }
  const close = () => {
    updateSummary();
    details.open = false;
    summary.focus();
  };
  details.addEventListener('input', () => {
    error.textContent = date.value && !parsedDate() ? invalidDate : '';
    updateSummary();
  }, { signal });
  requireElement(details, '[data-end-done]').addEventListener('click', () => {
    if (validate()) {
      close();
    }
  }, { signal });
  requireElement(details, '[data-end-clear]').addEventListener('click', () => {
    date.value = time.value = error.textContent = '';
    close();
  }, { signal });
  return { validate };
}
