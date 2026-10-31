/**
 * @param count
 */
export function formatPostCount(count: number): string {
  const lastTwo = count % 100;
  const last = count % 10;
  let word = 'постов';
  if (lastTwo < 11 || lastTwo > 14) {
    word = last === 1 ? 'пост' : last >= 2 && last <= 4 ? 'поста' : 'постов';
  }
  return `${count} ${word}`;
}

/**
 * @param publishedAt
 * @param referenceTime
 */
export function formatPublishedAt(publishedAt: string, referenceTime: Date): string {
  if (!publishedAt) {
    return '';
  }
  const minutes = Math.max(0, Math.floor((referenceTime.getTime() - new Date(publishedAt).getTime()) / 60000));
  if (minutes < 1) {
    return 'Только что';
  }
  if (minutes < 60) {
    return `${minutes} мин. назад`;
  }
  const hours = Math.floor(minutes / 60);
  if (hours < 24) {
    return `${hours} ч. назад`;
  }
  return new Intl.RelativeTimeFormat('ru', { numeric: 'always' }).format(-Math.floor(hours / 24), 'day');
}
