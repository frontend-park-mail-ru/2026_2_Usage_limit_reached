const TIMESTAMP = /^(\d{4}-(?:0[1-9]|1[0-2])-(?:0[1-9]|[12]\d|3[01]))T(?:[01]\d|2[0-3]):[0-5]\d:[0-5]\d(?:\.\d+)?(?:Z|[+-](?:[01]\d|2[0-3]):[0-5]\d)$/i;

/** Возвращает действующий срок в миллисекундах или undefined без разрешения. */
export function getOfflineDeadline(value: unknown, now = Date.now()): number | undefined {
  const date = typeof value === 'string' ? TIMESTAMP.exec(value)?.[1] : undefined;
  if (typeof value !== 'string' || !date || new Date(`${date}T00:00:00Z`).getUTCDate() !== Number(date.slice(8))) {
    return undefined;
  }
  const deadline = Date.parse(value);
  return deadline > now ? deadline : undefined;
}
