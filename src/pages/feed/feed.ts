import feedTemplate from './feed.hbs';
import { getFeed } from '@/modules/api/posts.ts';
import { checkSession } from '@/modules/auth/auth.actions.ts';
import { authStore } from '@/modules/auth/auth.store.ts';
import { bindPublicPosts } from '@/pages/profile/publicPosts.ts';

/** Показывает каркас общей ленты. */
export function renderFeed(): string {
  return feedTemplate({});
}

/** Подключает публичную ленту и проверяет сессию для меню профиля. */
export function initFeed(root: HTMLElement): () => void {
  if (authStore.getState().status === 'unknown') {
    void checkSession().catch(() => {});
  }
  const posts = bindPublicPosts(root, getFeed, true);
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
    unsubscribe();
    posts.destroy();
  };
}
