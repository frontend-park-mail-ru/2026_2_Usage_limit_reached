/**
 * Локальные дата и время с обозначением сегодняшнего и вчерашнего дня.
 * @param iso
 */
export function formatPostDate(iso: string): string {
  const date = new Date(iso);
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  const isSameDay = (other: Date) => date.getFullYear() === other.getFullYear()
    && date.getMonth() === other.getMonth()
    && date.getDate() === other.getDate();
  const day = isSameDay(today) ? 'Сегодня' : isSameDay(yesterday) ? 'Вчера'
    : new Intl.DateTimeFormat('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' })
      .format(date)
      .replace(/\s*г\.$/u, '');
  const time = new Intl.DateTimeFormat('ru-RU', { hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).format(date);
  return `${day}, ${time}`;
}

/**
 * Локальные дата и время изменения черновика в общем формате.
 * @param iso
 */
export function formatDraftDate(iso: string): string {
  return formatPostDate(iso);
}
