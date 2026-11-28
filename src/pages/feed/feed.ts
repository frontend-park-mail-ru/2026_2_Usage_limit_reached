import feedTemplate from './feed.hbs';
import { getFeed, getFeedSettings } from '@/modules/api/posts.ts';
import { ApiError } from '@/modules/api/request.ts';
import { checkSession, getSessionVersion } from '@/modules/auth/auth.actions.ts';
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
      if (isCurrent() && (query.attachment_type || query.accessible_only)
        && error instanceof ApiError && error.status === 403 && error.code === 'feed_advanced_filters_disabled') {
        refreshSettings(false);
        posts.updateFilters({ attachment_type: undefined, accessible_only: false });
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
  const attachmentHint = requireElement(section, '#feed-attachments-hint');
  const defaultAttachmentHint = attachmentHint.textContent;
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
  const accessible = requireElement<HTMLInputElement>(panel, '[name="accessible_only"]');
  const accessFilter = requireElement<HTMLElement>(panel, '.feed__access-filter');
  let appliedAttachment: FeedQuery['attachment_type'];
  let appliedAccessible = false;
  const syncFilterValues = () => {
    attachmentValue.textContent = ATTACHMENT_FILTERS.find(({ value }) => value === attachment.value)?.label ?? '';
    topicValue.textContent = tag.value || 'Все темы';
  };
  const restoreFilters = () => {
    panel.reset();
    accessible.checked = appliedAccessible;
    if (appliedTag) {
      tag.value = appliedTag;
    }
    if (appliedAttachment) {
      attachment.value = appliedAttachment;
    }
    syncFilterValues();
  };
  let settingsRequest: AbortController | undefined;
  let settingsSession = '';
  const refreshSettings = (allowFallback = true) => {
    const { status } = authStore.getState();
    settingsRequest?.abort();
    const controller = new AbortController();
    settingsRequest = controller;
    section.hidden = true;
    attachmentHint.textContent = defaultAttachmentHint;
    accessFilter.hidden = true;
    appliedAttachment = undefined;
    appliedAccessible = false;
    filterButton.removeAttribute('data-applied');
    if (panel.matches(':popover-open')) {
      panel.hidePopover();
    }
    restoreFilters();
    const load = async () => {
      if (status === 'unknown') {
        await checkSession().catch(() => {});
      }
      if (controller.signal.aborted) {
        return;
      }
      let useFallback = false;
      const settings = await getFeedSettings(controller.signal).catch((error: unknown) => {
        // В старом API фильтрацию решает сервер, а ручки настроек ещё нет.
        useFallback = allowFallback && error instanceof ApiError && [404, 405].includes(error.status);
        return null;
      });
      if (controller.signal.aborted) {
        return;
      }
      section.hidden = !useFallback && settings?.advanced_filters_enabled !== true;
      accessFilter.hidden = section.hidden || settings?.accessible_only_supported !== true;
      if (useFallback) {
        attachmentHint.textContent = 'Обложки постов не учитываются. Сервер может вернуть посты без учёта фильтра.';
      }
    };
    void load();
  };
  const syncSettings = () => {
    const { status, user } = authStore.getState();
    const session = JSON.stringify([status, user?.id, status === 'guest' ? null : getSessionVersion()]);
    if (settingsSession !== session) {
      settingsSession = session;
      refreshSettings();
    }
  };
  const unsubscribeSettings = authStore.subscribe(syncSettings);
  syncSettings();
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
    appliedAccessible = !accessFilter.hidden && accessible.checked;
    if (sheet.open) {
      appliedTag = tag.value;
      syncTopics();
    }
    filterButton.toggleAttribute('data-applied', Boolean(appliedAttachment) || appliedAccessible);
    posts.updateFilters({ tag: appliedTag || undefined, attachment_type: appliedAttachment, accessible_only: appliedAccessible });
    if (sheet.open) {
      sheet.close();
    } else {
      panel.hidePopover();
    }
  }, { signal });
  return () => {
    settingsRequest?.abort();
    unsubscribeSettings();
    events.abort();
    unbindAvatarFallback();
    posts.destroy();
  };
}
