import { ApiError } from '@/modules/api/request.ts';
import type { PostsPage, PostsQuery } from '@/modules/api/posts.types.ts';
import { accessOfflineCopy, captureOfflineToken, hasOfflineStorageError } from './offline.storage.ts';
import { isBackendUnavailable } from './offline.recovery.ts';

export interface OfflinePostsPage extends PostsPage {
  savedAt?: number;
}

interface SavedPage {
  key: string[];
  savedAt: number;
  page: PostsPage;
}

const MAX_PAGES = 20;
const MAX_PAGE_SIZE = 512 * 1024;
const MAX_AGE = 7 * 24 * 60 * 60 * 1000;

/** Загружает страницу из сети, при недоступности читает копию той же ревизии. */
export async function loadOfflineFeed(
  query: PostsQuery,
  load: () => Promise<PostsPage>,
  isCurrent: () => boolean,
): Promise<OfflinePostsPage> {
  const token = await captureOfflineToken();
  const key = ['feed', query.sort, query.cursor ?? ''];
  let page: PostsPage;
  try {
    page = await load();
  } catch (error) {
    if (!isBackendUnavailable(error)) {
      if (error instanceof ApiError && [401, 403, 404].includes(error.status)) {
        await accessOfflineCopy(token, 'readwrite', isCurrent, (store) => {
          store.delete(IDBKeyRange.bound(['feed'], ['feed', []]));
        });
      }
      throw error;
    }
    const saved = await accessOfflineCopy<SavedPage>(token, 'readonly', isCurrent, (store, result) => {
      const request = store.get(key);
      request.onsuccess = () => result(request.result);
    });
    if (!isCurrent() || !saved || Date.now() - saved.savedAt > MAX_AGE) {
      throw new ApiError(0, hasOfflineStorageError() ? 'offline_storage_unavailable' : 'offline_copy_missing');
    }
    return { ...saved.page, savedAt: saved.savedAt };
  }
  const copy: SavedPage = {
    key, savedAt: Date.now(),
    page: {
      next_cursor: page.next_cursor,
      items: page.items.map((item) => ({
        id: item.id, title: item.title, locked: item.locked,
        body_preview: item.locked ? '' : item.body_preview,
        published_or_updated_at: item.published_or_updated_at,
        author: { id: item.author.id, username: item.author.username, nickname: item.author.nickname },
        likes_count: item.likes_count, liked_by_user: false,
      })),
    },
  };
  await accessOfflineCopy(token, 'readwrite', isCurrent, (store) => {
    store.delete(key);
    if (new Blob([JSON.stringify(copy)]).size <= MAX_PAGE_SIZE) {
      store.put(copy, key);
    }
    const request = store.getAll(IDBKeyRange.bound(['feed'], ['feed', []]));
    request.onsuccess = () => {
      const pages = (request.result as SavedPage[]).sort((a, b) => b.savedAt - a.savedAt);
      pages.forEach((entry, index) => {
        if (index >= MAX_PAGES || Date.now() - entry.savedAt > MAX_AGE) {
          store.delete(entry.key);
        }
      });
    };
  });
  return page;
}
