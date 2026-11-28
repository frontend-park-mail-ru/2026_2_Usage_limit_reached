import feedTemplate from './feed.hbs';
import { getFeed } from '@/modules/api/posts.ts';
import { ApiError } from '@/modules/api/request.ts';
import { getSessionVersion } from '@/modules/auth/auth.actions.ts';
import { authStore } from '@/modules/auth/auth.store.ts';
import { bindLikedPosts } from '@/components/postsList/bindLikedPosts.ts';
import type { Navigate } from '@/app/paths.ts';
import { bindAvatarFallback } from '@/modules/profile/avatarFallback.ts';
import type { SetRefreshNotice } from '@/components/refreshNotice/refreshNotice.types.ts';
import type { RouteParams } from '@/app/router.types.ts';
import { requireElement } from '@/utils/helpers/dom.ts';
import { PROFILE_CATEGORIES } from '@/pages/settings/settings.constants.ts';
import type { FeedQuery, PostsPage } from '@/modules/api/posts.types.ts';

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
  const posts = bindLikedPosts(root, async (query, isCurrent): Promise<PostsPage> => {
    try {
      return await getFeed(query);
    } catch (error) {
      if (isCurrent() && query.attachment_type
        && error instanceof ApiError && error.status === 403 && error.code === 'feed_advanced_filters_disabled') {
        section.hidden = true;
        resetAttachment();
        posts.updateFilters({ attachment_type: undefined });
      }
      throw error;
    }
  }, navigate, true, undefined, false, setRefreshNotice);
  const form = requireElement<HTMLFormElement>(root, '[data-feed-search]');
  const input = requireElement<HTMLInputElement>(form, '[name="q"]');
  const clear = requireElement<HTMLButtonElement>(form, '[type="reset"]');
  const events = new AbortController();
  const { signal } = events;
  const mobile = window.matchMedia('(max-width: 720px)');
  const title = requireElement(root, '#feed-title');
  const sort = requireElement(root, '[data-public-sort]');
  const panel = requireElement<HTMLFormElement>(root, '#feed-filters');
  const filterButton = requireElement<HTMLButtonElement>(root, '[popovertarget="feed-filters"]');
  const tools = requireElement(root, '.feed__tools');
  const sheet = requireElement<HTMLDialogElement>(root, '#feed-filter-sheet');
  const section = requireElement<HTMLDetailsElement>(panel, '.feed__attachment-section');
  const syncToolbar = () => {
    input.placeholder = mobile.matches ? 'Поиск' : 'Поиск по постам';
    const focused = document.activeElement;
    if (mobile.matches) {
      title.after(sort);
      if (panel.matches(':popover-open')) {
        panel.hidePopover();
      }
      panel.removeAttribute('popover');
      filterButton.removeAttribute('popovertarget');
      filterButton.setAttribute('aria-haspopup', 'dialog');
      filterButton.setAttribute('aria-controls', sheet.id);
      sheet.append(panel);
    } else {
      sheet.close();
      tools.append(sort, panel);
      panel.setAttribute('popover', '');
      filterButton.setAttribute('popovertarget', panel.id);
      filterButton.removeAttribute('aria-haspopup');
      filterButton.removeAttribute('aria-controls');
      section.open = true;
    }
    if (focused instanceof HTMLElement && sort.contains(focused)) {
      focused.focus({ preventScroll: true });
    }
  };
  syncToolbar();
  mobile.addEventListener('change', syncToolbar, { signal });
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
  let appliedTag = '';
  const syncTopics = () => {
    topics.forEach((button) => button.setAttribute('aria-pressed', String(button.dataset.topic === appliedTag)));
    filterButton.toggleAttribute('data-topic-applied', Boolean(appliedTag));
  };
  topics.forEach((topic) => topic.addEventListener('click', () => {
    appliedTag = topic.dataset.topic ?? '';
    syncTopics();
    posts.updateFilters({ tag: appliedTag || undefined });
  }, { signal }));
  const attachment = panel.elements.namedItem('attachment_type') as RadioNodeList;
  const tag = panel.elements.namedItem('tag') as RadioNodeList;
  const topicSection = requireElement<HTMLDetailsElement>(panel, '.feed__topic-section');
  const topicValue = requireElement(panel, '[data-topic-value]');
  const attachmentValue = requireElement(panel, '[data-attachment-value]');
  let appliedAttachment: FeedQuery['attachment_type'];
  const syncFilterValues = () => {
    attachmentValue.textContent = ATTACHMENT_FILTERS.find(({ value }) => value === attachment.value)?.label ?? '';
    topicValue.textContent = tag.value || 'Все темы';
  };
  const restoreFilters = () => {
    panel.reset();
    if (appliedTag) {
      tag.value = appliedTag;
    }
    if (appliedAttachment) {
      attachment.value = appliedAttachment;
    }
    syncFilterValues();
  };
  const resetAttachment = () => {
    appliedAttachment = undefined;
    filterButton.removeAttribute('data-applied');
    if (panel.matches(':popover-open')) {
      panel.hidePopover();
    }
    restoreFilters();
  };
  const sessionKey = () => {
    const { status, user } = authStore.getState();
    return JSON.stringify([status, user?.id, status === 'guest' ? null : getSessionVersion()]);
  };
  let session = sessionKey();
  const unsubscribeSession = authStore.subscribe(() => {
    const next = sessionKey();
    if (session !== next) {
      session = next;
      section.hidden = false;
      resetAttachment();
    }
  });
  restoreFilters();
  filterButton.addEventListener('click', () => {
    if (mobile.matches) {
      restoreFilters();
      topicSection.open = false;
      section.open = false;
      sheet.showModal();
      sheet.scrollTop = 0;
    }
  }, { signal });
  requireElement(sheet, '.feed__filter-close').addEventListener('click', () => sheet.close(), { signal });
  sheet.addEventListener('close', () => {
    if (!sheet.open) {
      filterButton.focus({ preventScroll: true });
    }
  }, { signal });
  panel.addEventListener('change', syncFilterValues, { signal });
  panel.addEventListener('reset', () => {
    attachmentValue.textContent = ATTACHMENT_FILTERS[0].label;
    topicValue.textContent = 'Все темы';
  }, { signal });
  panel.addEventListener('beforetoggle', (event) => {
    if (event.newState === 'open') {
      restoreFilters();
    }
  }, { signal });
  panel.addEventListener('submit', (event) => {
    event.preventDefault();
    appliedAttachment = section.hidden ? undefined : (attachment.value || undefined) as FeedQuery['attachment_type'];
    if (sheet.open) {
      appliedTag = tag.value;
      syncTopics();
    }
    filterButton.toggleAttribute('data-applied', Boolean(appliedAttachment));
    posts.updateFilters({ tag: appliedTag || undefined, attachment_type: appliedAttachment });
    if (sheet.open) {
      sheet.close();
    } else {
      panel.hidePopover();
    }
  }, { signal });
  return () => {
    unsubscribeSession();
    events.abort();
    unbindAvatarFallback();
    posts.destroy();
  };
}
