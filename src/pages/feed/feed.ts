import feedTemplate from './feed.hbs';
import { getFeed } from '@/modules/api/posts.ts';
import { bindLikedPosts } from '@/components/postsList/bindLikedPosts.ts';
import type { Navigate } from '@/app/paths.ts';
import { bindAvatarFallback } from '@/modules/profile/avatarFallback.ts';
import type { SetRefreshNotice } from '@/components/refreshNotice/refreshNotice.types.ts';
import type { RouteParams } from '@/app/router.types.ts';
import { requireElement } from '@/utils/helpers/dom.ts';
import { PROFILE_CATEGORIES } from '@/pages/settings/settings.constants.ts';
import type { FeedQuery } from '@/modules/api/posts.types.ts';

const ATTACHMENT_FILTERS = [
  { value: '', label: 'Все посты', selected: true },
  { value: 'any', label: 'Любое вложение' },
  { value: 'video', label: 'Видео' },
  { value: 'image', label: 'Фото' },
  { value: 'audio', label: 'Аудио' },
  { value: 'file', label: 'Файл' },
];

/** Показывает каркас общей ленты. */
export function renderFeed(): string {
  return feedTemplate({ topics: PROFILE_CATEGORIES, attachments: ATTACHMENT_FILTERS });
}

/**
 * Подключает публичную ленту и проверяет сессию для меню профиля.
 * @param root Контейнер страницы ленты.
 * @param navigate Переход на страницу входа при действии гостя.
 * @returns Отключение обработчиков страницы и подписки на авторизацию.
 */
export function initFeed(root: HTMLElement, navigate: Navigate, _params: RouteParams, setRefreshNotice: SetRefreshNotice): () => void {
  const unbindAvatarFallback = bindAvatarFallback(root);
  const posts = bindLikedPosts(root, getFeed, navigate, true, undefined, false, setRefreshNotice);
  const form = requireElement<HTMLFormElement>(root, '[data-feed-search]');
  const input = requireElement<HTMLInputElement>(form, '[name="q"]');
  const clear = requireElement<HTMLButtonElement>(form, '[type="reset"]');
  const events = new AbortController();
  const { signal } = events;
  form.addEventListener('submit', (event) => {
    event.preventDefault();
    posts.updateFilters({ q: input.value });
  }, { signal });
  const syncSearchClear = () => {
    clear.hidden = !input.value;
    if (clear.hidden) {
      posts.updateFilters({ q: undefined });
    }
  };
  input.addEventListener('input', syncSearchClear, { signal });
  form.addEventListener('reset', (event) => {
    event.preventDefault();
    input.value = '';
    syncSearchClear();
    input.focus();
  }, { signal });
  const topics = root.querySelectorAll<HTMLButtonElement>('[data-topic]');
  topics.forEach((topic) => topic.addEventListener('click', () => {
    topics.forEach((button) => button.setAttribute('aria-pressed', String(button === topic)));
    posts.updateFilters({ tag: topic.dataset.topic || undefined });
  }, { signal }));
  const filterButton = requireElement<HTMLButtonElement>(root, '[popovertarget="feed-filters"]');
  const panel = requireElement<HTMLFormElement>(root, '#feed-filters');
  const attachment = panel.elements.namedItem('attachment_type') as RadioNodeList;
  let appliedAttachment: FeedQuery['attachment_type'];
  panel.addEventListener('beforetoggle', (event) => {
    if (event.newState === 'open') {
      panel.reset();
      if (appliedAttachment) {
        attachment.value = appliedAttachment;
      }
    }
  }, { signal });
  panel.addEventListener('submit', (event) => {
    event.preventDefault();
    appliedAttachment = (attachment.value || undefined) as FeedQuery['attachment_type'];
    filterButton.toggleAttribute('data-applied', Boolean(appliedAttachment));
    posts.updateFilters({ attachment_type: appliedAttachment });
    panel.hidePopover();
  }, { signal });
  return () => {
    events.abort();
    unbindAvatarFallback();
    posts.destroy();
  };
}
