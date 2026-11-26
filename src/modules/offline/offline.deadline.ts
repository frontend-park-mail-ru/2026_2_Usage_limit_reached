import type { PostPreview } from '@/modules/api/posts.types.ts';

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

type CachedPreview = Pick<PostPreview, 'locked' | 'body_preview' | 'offline_cache_until'>;
const EMPTY_PREVIEW = { body_preview: '', offline_cache_until: null };

/** Возвращает превью и срок из одной версии карточки. */
export function copyOfflinePreview(item: CachedPreview, now = Date.now()) {
  return !item.locked && getOfflineDeadline(item.offline_cache_until, now) !== undefined
    ? { body_preview: item.body_preview, offline_cache_until: item.offline_cache_until }
    : EMPTY_PREVIEW;
}

export function revokedPreviewIds(items: (CachedPreview & { id: string })[]): Set<string> {
  return new Set(items.filter((item) => copyOfflinePreview(item).offline_cache_until === null).map(({ id }) => id));
}

/** Удаляет из копии текст без разрешения и сообщает, нужно ли обновить запись. */
export function clearUnavailablePreviews(items: (CachedPreview & { id: string })[], revoked?: ReadonlySet<string>): boolean {
  const now = Date.now();
  let changed = false;
  for (const item of items) {
    const preview = revoked ? (revoked.has(item.id) ? EMPTY_PREVIEW : item) : copyOfflinePreview(item, now);
    if (item.body_preview !== preview.body_preview || item.offline_cache_until !== preview.offline_cache_until) {
      Object.assign(item, preview);
      changed = true;
    }
  }
  return changed;
}
