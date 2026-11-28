import { checkSession, getSessionContext, getSessionVersion } from '@/modules/auth/auth.actions.ts';
import { loadOfflinePosts } from '@/modules/offline/offline.pages.ts';
import { authStore } from '@/modules/auth/auth.store.ts';
import type { SessionContext } from '@/modules/auth/auth.types.ts';
import { bindPublicPosts } from '@/components/postsList/publicPosts.ts';
import { LikeButton } from '@/components/likeButton/likeButton.ts';
import { sendLike } from '@/components/likeButton/sendLike.ts';
import { showToast } from '@/components/toast/toast.ts';
import { ROUTES } from '@/app/paths.ts';
import type { Navigate } from '@/app/paths.ts';
import type { FeedQuery, PostsPage, PostsQuery } from '@/modules/api/posts.types.ts';
import type { SetRefreshNotice } from '@/components/refreshNotice/refreshNotice.types.ts';

export type FeedFilters = Omit<FeedQuery, keyof PostsQuery>;

/**
 * Подключает лайки и обновление списка при смене сессии.
 * @param root Контейнер списка.
 * @param loadPage Загрузка страницы постов.
 * @param navigate Переход на вход для гостя.
 * @param feed Отображение карточек общей ленты.
 * @param offlineProfile Имя автора для сохранения публичного списка.
 * @param readOnly Режим чтения сохранённого профиля.
 * @param setRefreshNotice
 */
export function bindLikedPosts(
  root: HTMLElement,
  loadPage: (query: FeedQuery) => Promise<PostsPage>,
  navigate: Navigate,
  feed = false,
  offlineProfile?: string,
  readOnly = false,
  setRefreshNotice?: SetRefreshNotice,
) {
  const pendingLikes = new Map<ReturnType<typeof sendLike>, SessionContext>();
  let offline = false;
  let filters: FeedFilters = {};
  const offlineEnabled = feed || offlineProfile !== undefined;
  const onlineOnly = () => Boolean(filters.q || filters.tag || filters.attachment_type || filters.accessible_only);
  const posts = bindPublicPosts(root, async (query, isCurrent) => {
    const selection = filters;
    const filtered = onlineOnly();
    if (authStore.getState().status === 'unknown' || (offlineEnabled && offline)) {
      await checkSession().catch(() => {});
    }
    const context = getSessionContext();
    const version = getSessionVersion();
    const pending = [...pendingLikes].filter(([, owner]) => owner === context);
    if (pending.length > 0) {
      await Promise.allSettled(pending.map(([request]) => request));
    }
    const current = () => isCurrent() && version === getSessionVersion();
    if (!current()) {
      return { items: [], next_cursor: null };
    }
    const load = () => loadPage({ ...query, ...selection });
    if (!offlineEnabled) {
      return load();
    }
    const page = await loadOfflinePosts(query, load, current, offlineProfile, filtered);
    if (current()) {
      offline = page.savedAt !== undefined;
    }
    return page;
  }, (button, item) => {
    new LikeButton(button, item, async (liked) => {
      if (authStore.getState().status === 'unknown') {
        await checkSession().catch(() => {});
      }
      if (!button.isConnected) {
        return null;
      }
      if (authStore.getState().status === 'guest') {
        navigate(ROUTES.login);
        return null;
      }
      const context = getSessionContext();
      if (!context) {
        showToast('Не удалось подтвердить сессию. Попробуйте позже', 'error');
        return null;
      }
      const request = sendLike(item.id, liked, context, () => button.isConnected);
      pendingLikes.set(request, context);
      try {
        return await request;
      } finally {
        pendingLikes.delete(request);
      }
    });
  }, feed, offlineEnabled, readOnly, setRefreshNotice, onlineOnly);
  let previous = authStore.getState();
  let previousVersion = getSessionVersion();
  const unsubscribe = authStore.subscribe(() => {
    const current = authStore.getState();
    const version = getSessionVersion();
    const changed = current.status === 'unknown'
      || ((feed || previous.status !== 'unknown')
        && (current.status !== previous.status || current.user?.id !== previous.user?.id))
      || (feed && current.status === 'authenticated' && version !== previousVersion);
    previous = current;
    previousVersion = version;
    if (changed) {
      if (feed) {
        filters = { ...filters, attachment_type: undefined, accessible_only: undefined };
      }
      posts.reload();
    }
  });
  return {
    updateFilters(changes: FeedFilters) {
      const next = { ...filters, ...changes };
      const q = next.q?.trim() || undefined;
      const accessible_only = next.accessible_only || undefined;
      if (q !== filters.q || next.tag !== filters.tag || next.attachment_type !== filters.attachment_type
        || accessible_only !== filters.accessible_only) {
        filters = { ...next, q, accessible_only };
        posts.reload();
      }
    },
    destroy() {
      unsubscribe();
      posts.destroy();
    },
  };
}
