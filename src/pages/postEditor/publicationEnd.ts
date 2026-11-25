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
  const clear = requireElement<HTMLButtonElement>(details, '[data-end-clear]');
  let explicitlyCleared = false;
  let savedMinute = '';
  const enteredMinute = () => `${date.value}T${time.value}`;
  const parsedDate = () => {
    const parsed = new Date(`${date.value}T12:00`);
    return /^\d{4}-\d{2}-\d{2}$/.test(date.value) && Number.isFinite(parsed.getTime()) ? parsed : null;
  };
  const invalidDate = 'Укажите дату с четырёхзначным годом';
  const validate = () => {
    const invalid = date.value && !parsedDate();
    const field = invalid || date.validity.badInput || (time.value && !date.value) ? date
      : time.validity.badInput || (date.value && !time.value) ? time : null;
    let message = invalid ? invalidDate : field === time ? 'Укажите время завершения' : 'Укажите дату завершения';
    if (!field && !date.value && savedEnd && !explicitlyCleared) {
      message = 'Чтобы убрать дату, нажмите «Убрать дату»';
    } else if (!field && date.value && enteredMinute() !== savedMinute) {
      const moment = new Date(enteredMinute());
      if (Number.isFinite(+moment) && moment.getUTCFullYear() >= 1 && moment.getUTCFullYear() <= 9999
        && toLocalMinute(moment) === enteredMinute()) {
        return true;
      }
      message = 'Укажите другую дату или время завершения';
    } else if (!field) {
      return true;
    }
    details.open = true;
    error.textContent = message;
    (field ?? (date.value ? time : clear)).focus();
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
    savedMinute = toLocalMinute(savedDate);
    [date.value, time.value] = savedMinute.split('T');
    updateSummary();
  }
  const close = () => {
    updateSummary();
    details.open = false;
    summary.focus();
  };
  details.addEventListener('input', () => {
    explicitlyCleared = false;
    error.textContent = date.value && !parsedDate() ? invalidDate : '';
    updateSummary();
  }, { signal });
  requireElement(details, '[data-end-done]').addEventListener('click', () => {
    if (validate()) {
      close();
    }
  }, { signal });
  clear.addEventListener('click', () => {
    explicitlyCleared = true;
    date.value = time.value = error.textContent = '';
    close();
  }, { signal });
  return {
    validate,
    getSavedEnd: () => savedEnd,
    getChange() {
      if (!date.value) {
        return savedEnd && explicitlyCleared ? null : undefined;
      }
      return enteredMinute() === savedMinute ? undefined : new Date(enteredMinute()).toISOString();
    },
    markSaved(change: string | null | undefined) {
      if (change !== undefined) {
        savedEnd = change;
        savedMinute = change ? enteredMinute() : '';
        explicitlyCleared = false;
      }
    },
  };
}
