import type { PostPreview } from '@/modules/api/posts.types.ts';
import { postEditRoute, postRoute } from '@/app/paths.ts';
import { formatDraftDate, formatPostDate } from '@/utils/helpers/posts.ts';
import { htmlToText } from '@/modules/sanitize/sanitize.ts';
import { DRAFT_MENU_ITEMS } from './postCard.constants.ts';

/**
 * Данные карточки поста или черновика.
 * @param item
 * @param isDraft
 */
export function buildPostCard(item: PostPreview, isDraft = false) {
  const date = item.published_or_updated_at ?? '';
  return {
    id: item.id,
    href: isDraft ? postEditRoute(item.id) : postRoute(item.id),
    preview: item.locked ? '' : htmlToText(item.body_preview),
    title: item.title,
    isDraft,
    likesCount: item.likes_count,
    date,
    dateLabel: date ? (isDraft ? formatDraftDate(date) : formatPostDate(date)) : '',
    menuId: `draft-menu-${item.id}`,
    menuItems: DRAFT_MENU_ITEMS,
  };
}

