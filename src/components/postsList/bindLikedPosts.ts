import { checkSession, getSessionContext } from '@/modules/auth/auth.actions.ts';
import { authStore } from '@/modules/auth/auth.store.ts';
import type { SessionContext } from '@/modules/auth/auth.types.ts';
import { bindPublicPosts } from '@/components/postsList/publicPosts.ts';
import { LikeButton } from '@/components/likeButton/likeButton.ts';
import { sendLike } from '@/components/likeButton/sendLike.ts';
import { showToast } from '@/components/toast/toast.ts';
import { ROUTES } from '@/app/paths.ts';
import type { Navigate } from '@/app/paths.ts';
import type { PostsPage, PostsQuery } from '@/modules/api/posts.types.ts';

/**
 * Подключает лайки и обновление списка при смене сессии.
 * @param root Контейнер списка.
 * @param loadPage Загрузка страницы постов.
 * @param navigate Переход на вход для гостя.
 * @param feed Отображение карточек общей ленты.
 */
export function bindLikedPosts(
  root: HTMLElement,
  loadPage: (query: PostsQuery) => Promise<PostsPage>,
  navigate: Navigate,
  feed = false
): () => void {
  const pendingLikes = new Map<ReturnType<typeof sendLike>, SessionContext>();
  const posts = bindPublicPosts(root, async (query) => {
    if (authStore.getState().status === 'unknown') {
      await checkSession().catch(() => {});
    }
    const context = getSessionContext();
    const pending = [...pendingLikes].filter(([, owner]) => owner === context);
    if (pending.length > 0) {
      await Promise.allSettled(pending.map(([request]) => request));
    }
    return loadPage(query);
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
        showToast('Не удалось подтвердить сессию. Попробуйте позже');
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
  }, feed);
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
