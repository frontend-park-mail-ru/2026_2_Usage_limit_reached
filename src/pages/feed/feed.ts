import feedTemplate from './feed.hbs';
import { getFeed } from '@/modules/api/posts.ts';
import { checkSession, getSessionContext } from '@/modules/auth/auth.actions.ts';
import { authStore } from '@/modules/auth/auth.store.ts';
import type { SessionContext } from '@/modules/auth/auth.types.ts';
import { bindPublicPosts } from '@/components/postsList/publicPosts.ts';
import { LikeButton } from '@/components/likeButton/likeButton.ts';
import { sendLike } from '@/components/likeButton/sendLike.ts';
import { showToast } from '@/components/toast/toast.ts';
import { ROUTES } from '@/app/paths.ts';
import type { Navigate } from '@/app/paths.ts';
import { bindAvatarFallback } from '@/modules/profile/avatarFallback.ts';

/** Показывает каркас общей ленты. */
export function renderFeed(): string {
  return feedTemplate({});
}

/**
 * Подключает публичную ленту и проверяет сессию для меню профиля.
 * @param root Контейнер страницы ленты.
 * @param navigate Переход на страницу входа при действии гостя.
 * @returns Отключение обработчиков страницы и подписки на авторизацию.
 */
export function initFeed(root: HTMLElement, navigate: Navigate): () => void {
  const unbindAvatarFallback = bindAvatarFallback(root);
  if (authStore.getState().status === 'unknown') {
    void checkSession().catch(() => {});
  }
  const pendingLikes = new Map<ReturnType<typeof sendLike>, SessionContext>();
  const posts = bindPublicPosts(root, async (query) => {
    const context = getSessionContext();
    const pending = [...pendingLikes].filter(([, owner]) => owner === context);
    if (pending.length > 0) {
      await Promise.allSettled(pending.map(([request]) => request));
    }
    return getFeed(query);
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
  });
  let previous = authStore.getState();
  const unsubscribe = authStore.subscribe(() => {
    const current = authStore.getState();
    const changed = current.status === 'unknown' || (previous.status !== 'unknown'
      && (current.status !== previous.status || current.user?.id !== previous.user?.id));
    previous = current;
    if (changed) {
      posts.reload();
      if (current.status === 'unknown') {
        void checkSession().catch(() => {});
      }
    }
  });
  return () => {
    unbindAvatarFallback();
    unsubscribe();
    posts.destroy();
  };
}
