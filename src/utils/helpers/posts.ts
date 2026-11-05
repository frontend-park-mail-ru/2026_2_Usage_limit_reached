/**
 * Дата вида «11 октября 2026».
 * @param iso
 */
export function formatPostDate(iso: string): string {
  return new Intl.DateTimeFormat('ru', { day: 'numeric', month: 'long', year: 'numeric' })
    .format(new Date(iso))
    .replace(/\s*г\.$/u, '');
}

/**
 * Дата черновика вида «5 октября, 12:40».
 * @param iso
 */
export function formatDraftDate(iso: string): string {
  const date = new Date(iso);
  const day = new Intl.DateTimeFormat('ru', { day: 'numeric', month: 'long' }).format(date);
  const time = new Intl.DateTimeFormat('ru', { hour: '2-digit', minute: '2-digit' }).format(date);
  return `${day}, ${time}`;
}
