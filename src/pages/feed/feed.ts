import feedTemplate from './feed.hbs';
import { getFeed } from '@/modules/api/posts.ts';
import { bindLikedPosts } from '@/components/postsList/bindLikedPosts.ts';
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
  const disposePosts = bindLikedPosts(root, getFeed, navigate, true);
  return () => {
    unbindAvatarFallback();
    disposePosts();
  };
}
