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
import type { PostsPage, PostsQuery } from '@/modules/api/posts.types.ts';
import type { SetRefreshNotice } from '@/components/refreshNotice/refreshNotice.types.ts';

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
  loadPage: (query: PostsQuery) => Promise<PostsPage>,
  navigate: Navigate,
  feed = false,
  offlineProfile?: string,
  readOnly = false,
  setRefreshNotice?: SetRefreshNotice,
): () => void {
  const pendingLikes = new Map<ReturnType<typeof sendLike>, SessionContext>();
  let offline = false;
  const offlineEnabled = feed || offlineProfile !== undefined;
  const posts = bindPublicPosts(root, async (query, isCurrent) => {
    if (authStore.getState().status === 'unknown' || (offlineEnabled && offline)) {
      await checkSession().catch(() => {});
    }
    const context = getSessionContext();
    const pending = [...pendingLikes].filter(([, owner]) => owner === context);
    if (pending.length > 0) {
      await Promise.allSettled(pending.map(([request]) => request));
    }
    const version = getSessionVersion();
    if (!offlineEnabled) {
      return loadPage(query);
    }
    const page = await loadOfflinePosts(query, () => loadPage(query),
      () => isCurrent() && version === getSessionVersion(), offlineProfile);
    if (isCurrent()) {
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
  }, feed, offlineEnabled, readOnly, setRefreshNotice);
  let previous = authStore.getState();
  const unsubscribe = authStore.subscribe(() => {
    const current = authStore.getState();
    const changed = current.status === 'unknown' || (previous.status !== 'unknown'
      && (current.status !== previous.status || current.user?.id !== previous.user?.id));
    previous = current;
    if (changed) {
      posts.reload();
    }
  });
  return () => {
    unsubscribe();
    posts.destroy();
  };
}
