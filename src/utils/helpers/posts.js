/**
 * Добавляет к количеству постов нужную форму слова "пост".
 * @param {number} count - Количество постов.
 * @returns {string} Количество с подписью.
 */
export function formatPostCount(count) {
  const lastTwo = count % 100;
  const last = count % 10;
  let word = 'постов';
  if (lastTwo < 11 || lastTwo > 14) {
    if (last === 1) word = 'пост';
    else if (last >= 2 && last <= 4) word = 'поста';
  }
  return `${count} ${word}`;
}

/**
 * Показывает, сколько времени прошло с публикации.
 * @param {string} publishedAt - Дата публикации.
 * @param {Date} referenceTime - Время для сравнения.
 * @returns {string} Время с публикации или пустая строка.
 */
export function formatPublishedAt(publishedAt, referenceTime) {
  if (!publishedAt) return '';
  const minutes = Math.max(0, Math.floor((referenceTime - new Date(publishedAt)) / 60000));
  if (minutes < 1) return 'Только что';
  if (minutes < 60) return `${minutes} мин. назад`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} ч. назад`;
  return new Intl.RelativeTimeFormat('ru', { numeric: 'always' }).format(-Math.floor(hours / 24), 'day');
}
