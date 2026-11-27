/** Форматирует момент в местном часовом поясе для полей даты и времени. */
export function toLocalMinute(date: Date): string {
  return new Date(+date - date.getTimezoneOffset() * 60_000).toISOString().slice(0, 16);
}
