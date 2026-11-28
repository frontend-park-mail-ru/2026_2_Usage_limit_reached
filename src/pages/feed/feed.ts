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
  topics.forEach((topic) => topic.addEventListener('click', () => {
    topics.forEach((button) => button.setAttribute('aria-pressed', String(button === topic)));
    posts.updateFilters({ tag: topic.dataset.topic || undefined });
  }, { signal }));
  const attachment = panel.elements.namedItem('attachment_type') as RadioNodeList;
  const attachmentValue = requireElement(panel, '[data-attachment-value]');
  const accessible = requireElement<HTMLInputElement>(panel, '[name="accessible_only"]');
  let appliedAttachment: FeedQuery['attachment_type'];
  let appliedAccessible = false;
  const syncAttachmentValue = () => {
    attachmentValue.textContent = ATTACHMENT_FILTERS.find(({ value }) => value === attachment.value)?.label ?? '';
  };
  const restoreFilters = () => {
    panel.reset();
    accessible.checked = appliedAccessible;
    if (appliedAttachment) {
      attachment.value = appliedAttachment;
    }
    syncAttachmentValue();
  };
  filterButton.addEventListener('click', () => {
    if (mobile.matches) {
      restoreFilters();
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
  panel.addEventListener('change', syncAttachmentValue, { signal });
  panel.addEventListener('reset', () => {
    attachmentValue.textContent = ATTACHMENT_FILTERS[0].label;
  }, { signal });
  panel.addEventListener('beforetoggle', (event) => {
    if (event.newState === 'open') {
      restoreFilters();
    }
  }, { signal });
  panel.addEventListener('submit', (event) => {
    event.preventDefault();
    appliedAttachment = (attachment.value || undefined) as FeedQuery['attachment_type'];
    appliedAccessible = accessible.checked;
    filterButton.toggleAttribute('data-applied', Boolean(appliedAttachment) || appliedAccessible);
    posts.updateFilters({ attachment_type: appliedAttachment, accessible_only: appliedAccessible });
    if (sheet.open) {
      sheet.close();
    } else {
      panel.hidePopover();
    }
  }, { signal });
  return () => {
    events.abort();
    unbindAvatarFallback();
    posts.destroy();
  };
}
