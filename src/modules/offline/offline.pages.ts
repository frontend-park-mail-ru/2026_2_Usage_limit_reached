import { ApiError } from '@/modules/api/request.ts';
import type { Post, PostPreview, PostsPage, PostsQuery } from '@/modules/api/posts.types.ts';
import { sanitizeHtml } from '@/modules/sanitize/sanitize.ts';
import type { PublicProfile } from '@/modules/api/profile.types.ts';
import type { DonationsDirection, DonationsPage } from '@/modules/api/donations.types.ts';
import { accessOfflineCopy, captureOfflineToken, hasOfflineStorageError } from './offline.storage.ts';
import { isBackendUnavailable } from './offline.recovery.ts';
import { copyOfflinePreview, getOfflineDeadline } from './offline.deadline.ts';

export interface OfflinePostsPage extends PostsPage {
  items: (PostPreview & { hasLikesCount?: boolean })[];
  savedAt?: number;
}

interface SavedPage<T> {
  key: string[];
  savedAt: number;
  page: T;
}

const MAX_PAGES = 20;
const MAX_PAGE_SIZE = 512 * 1024;
const MAX_AGE = 7 * 24 * 60 * 60 * 1000;

/** Сохраняет только поля карточек, разделяя ленту и публикации разных авторов. */
export function loadOfflinePosts(
  query: PostsQuery,
  load: () => Promise<PostsPage>,
  isCurrent: () => boolean,
  username?: string,
): Promise<OfflinePostsPage> {
  const key = [...(username === undefined ? ['feed'] : ['public', username, 'posts']), query.sort, query.cursor ?? ''];
  return loadOfflinePage(key, load, (page) => ({
    next_cursor: page.next_cursor,
    items: page.items.map((item) => ({
      id: item.id, title: item.title, locked: item.locked,
      ...copyOfflinePreview(item),
      published_or_updated_at: item.published_or_updated_at,
      author: { id: item.author.id, username: item.author.username, nickname: item.author.nickname },
      likes_count: item.likes_count, liked_by_user: item.liked_by_user,
    })),
  }), isCurrent);
}

/** Сохраняет публичные сведения без контактов и платёжных данных. */
export function loadOfflinePublicProfile(username: string, load: () => Promise<PublicProfile>, isCurrent: () => boolean) {
  return loadOfflinePage(['public', username, 'profile'], load, ({ user, author }) => ({
    user: { id: user.id, username: user.username, nickname: user.nickname, created_at: user.created_at },
    ...(author ? { author: { bio: author.bio, category: author.category } } : {}),
  }), isCurrent);
}

/** Сохраняет тело открытого опубликованного поста с действующим разрешением. */
export function loadOfflinePost(id: string, load: () => Promise<Post>, isCurrent: () => boolean) {
  const canCache = (post: Post) => !post.locked && post.status === 'published'
    && getOfflineDeadline(post.offline_cache_until) !== undefined;
  return loadOfflinePage<Post & { hasAttachments?: boolean }>(['post', id], load, (post) => {
    if (!canCache(post)) {
      return null;
    }
    return {
      id: post.id, title: post.title, body: sanitizeHtml(post.body), status: post.status, locked: false,
      offline_cache_until: post.offline_cache_until,
      hasAttachments: !!new DOMParser().parseFromString(post.body, 'text/html').body.querySelector('figure[data-attachment-id]'),
      author: { id: post.author.id, nickname: post.author.nickname, username: post.author.username },
      published_at: post.published_at, created_at: post.created_at, updated_at: post.updated_at,
      likes_count: post.likes_count, liked_by_user: post.liked_by_user,
    };
  }, isCurrent, { canRead: canCache });
}

/** Сохраняет историю владельца, исключая скрытые данные анонимного отправителя. */
export function loadOfflineDonations(ownerId: string, direction: DonationsDirection, cursor: string | null,
  load: () => Promise<DonationsPage>, isCurrent: () => boolean) {
  return loadOfflinePage(['donations', ownerId, direction, cursor ?? ''], load, (page) => ({
    next_cursor: page.next_cursor,
    items: page.items.map((item) => ({
      id: item.id, message: item.message, amount_minor: item.amount_minor, currency: item.currency,
      status: item.status, created_or_paid_at: item.created_or_paid_at, is_anonymous: item.is_anonymous,
      user: item.is_anonymous || !item.user ? null
        : { username: item.user.username, nickname: item.user.nickname, avatar_url: null },
    })),
  }), isCurrent, { ownerId });
}

/** Загружает данные из сети, при недоступности читает копию той же ревизии. */
async function loadOfflinePage<T extends object>(
  key: string[], load: () => Promise<T>, copy: (page: T) => T | null, isCurrent: () => boolean,
  { ownerId, canRead }: { ownerId?: string; canRead?: (page: T) => boolean } = {},
): Promise<T & { savedAt?: number }> {
  const captured = await captureOfflineToken();
  const token = ownerId === undefined || captured?.ownerId === ownerId ? captured : undefined;
  const group = key[0] === 'donations' ? key.slice(0, 3)
    : key[0] === 'post' ? key : key[0] === 'public' ? key.slice(0, 2) : key.slice(0, 1);
  let page: T;
  try {
    page = await load();
  } catch (error) {
    if (!isBackendUnavailable(error)) {
      if (error instanceof ApiError && [401, 403, 404].includes(error.status)) {
        await accessOfflineCopy(token, 'readwrite', isCurrent, (store) => {
          store.delete(IDBKeyRange.bound(group, [...group, []]));
        });
      }
      throw error;
    }
    const saved = await accessOfflineCopy<SavedPage<T>>(token, canRead ? 'readwrite' : 'readonly', isCurrent, (store, result) => {
      const request = store.get(key);
      request.onsuccess = () => {
        const entry = request.result as SavedPage<T> | undefined;
        if (entry && canRead && !canRead(entry.page)) {
          store.delete(key);
          return;
        }
        if (entry) {
          result(entry);
        }
      };
    });
    if (!isCurrent() || !saved || Date.now() - saved.savedAt > MAX_AGE || (canRead && !canRead(saved.page))) {
      throw new ApiError(0, hasOfflineStorageError() ? 'offline_storage_unavailable' : 'offline_copy_missing');
    }
    return { ...saved.page, savedAt: saved.savedAt };
  }
  const value = copy(page);
  const saved = value && { key, savedAt: Date.now(), page: value };
  await accessOfflineCopy(token, 'readwrite', isCurrent, (store) => {
    store.delete(key);
    if (key[0] === 'donations' && key[3] === '') {
      store.delete(IDBKeyRange.bound(group, [...group, []]));
    }
    if (saved && new Blob([JSON.stringify(saved)]).size <= MAX_PAGE_SIZE) {
      store.put(saved, key);
    }
    const request = store.getAll(IDBKeyRange.bound([key[0]], [key[0], []]));
    request.onsuccess = () => {
      const pages = (request.result as SavedPage<T>[]).sort((a, b) => b.savedAt - a.savedAt);
      if (key[0] === 'donations') {
        const current = pages.filter((entry) => entry.key[1] === key[1] && entry.key[2] === key[2]);
        const byCursor = new Map(current.map((entry) => [entry.key[3], entry]));
        const kept = new Set<SavedPage<T>>();
        let next: string | null = '';
        while (next !== null && kept.size < MAX_PAGES) {
          const entry = byCursor.get(next);
          if (!entry || kept.has(entry) || Date.now() - entry.savedAt > MAX_AGE) {
            break;
          }
          kept.add(entry);
          next = (entry.page as DonationsPage).next_cursor;
        }
        current.filter((entry) => !kept.has(entry)).forEach((entry) => store.delete(entry.key));
      }
      const counts = new Map<string, number>();
      pages.forEach((entry) => {
        if (entry.key[0] === 'donations') {
          return;
        }
        const kind = entry.key[0] === 'public' || entry.key[0] === 'donations' ? entry.key[2] : 'feed';
        const count = counts.get(kind) ?? 0;
        if (count >= MAX_PAGES || Date.now() - entry.savedAt > MAX_AGE) {
          store.delete(entry.key);
        } else {
          counts.set(kind, count + 1);
        }
      });
    };
  });
  return page;
}
