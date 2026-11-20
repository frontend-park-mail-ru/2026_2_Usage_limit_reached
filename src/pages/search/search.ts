import searchTemplate from './search.hbs';
import authorResultTemplate from './authorResult.hbs';
import { publicProfileRoute } from '@/app/paths.ts';
import { searchAuthors } from '@/modules/api/authors.ts';
import { checkSession } from '@/modules/auth/auth.actions.ts';
import { authStore } from '@/modules/auth/auth.store.ts';
import { PROFILE_CATEGORIES } from '@/pages/settings/settings.constants.ts';
import { requireElement } from '@/utils/helpers/dom.ts';

/** Показывает форму поиска авторов. */
export function renderSearch(): string {
  return searchTemplate({ categories: PROFILE_CATEGORIES });
}

/** Подключает поиск и отключает его при уходе со страницы. */
export function initSearch(root: HTMLElement): () => void {
  const form = requireElement<HTMLFormElement>(root, '.author-search__form');
  const input = requireElement<HTMLInputElement>(form, '#author-query');
  const status = requireElement<HTMLElement>(root, '[data-search-status]');
  const results = requireElement<HTMLUListElement>(root, '[data-search-results]');
  const events = new AbortController();
  const { signal } = events;
  const filter = requireElement(form, '.author-search__filter');
  const trigger = requireElement<HTMLButtonElement>(filter, '.author-search__categories');
  const panel = requireElement<HTMLDialogElement>(filter, '#author-categories');
  const chips = requireElement<HTMLElement>(root, '.author-search__chips');
  const options = [...panel.querySelectorAll<HTMLInputElement>('input[type="checkbox"]')];
  const mobile = window.matchMedia('(max-width: 720px)');
  let tags: string[] = [];
  let q = '';
  let version = 0;

  function applyTags(next: string[]): void {
    tags = next;
    trigger.textContent = tags.length ? `Категории · ${tags.length}` : 'Категории';
    chips.hidden = tags.length === 0;
    chips.querySelectorAll<HTMLButtonElement>('button').forEach((chip) => {
      chip.hidden = !tags.includes(chip.dataset.tag ?? '');
    });
    void search();
  }

  trigger.addEventListener('click', () => {
    if (panel.open) {
      panel.close();
      return;
    }
    options.forEach((option) => { option.checked = tags.includes(option.value); });
    if (mobile.matches) {
      panel.showModal();
    } else {
      panel.show();
    }
    trigger.setAttribute('aria-expanded', 'true');
  }, { signal });
  panel.addEventListener('close', () => {
    trigger.setAttribute('aria-expanded', String(panel.open));
  }, { signal });
  panel.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') {
      event.preventDefault();
      panel.close();
      trigger.focus();
    }
  }, { signal });
  document.addEventListener('pointerdown', (event) => {
    if (event.target instanceof Node && (event.target === panel || !filter.contains(event.target))) {
      panel.close();
    }
  }, { signal });
  mobile.addEventListener('change', () => panel.close(), { signal });
  requireElement(panel, '[data-category-reset]').addEventListener('click', () => {
    options.forEach((option) => { option.checked = false; });
  }, { signal });
  requireElement(panel, '[data-category-apply]').addEventListener('click', () => {
    panel.close();
    trigger.focus();
    q = input.value.trim();
    applyTags(options.filter((option) => option.checked).map((option) => option.value));
  }, { signal });
  chips.addEventListener('click', (event) => {
    const chip = event.target instanceof Element ? event.target.closest<HTMLButtonElement>('[data-tag]') : null;
    if (chip) {
      trigger.focus();
      applyTags(tags.filter((tag) => tag !== chip.dataset.tag));
    }
  }, { signal });

  results.addEventListener('error', (event) => {
    if (event.target instanceof HTMLImageElement) {
      event.target.remove();
    }
  }, { capture: true, signal });

  async function search(): Promise<void> {
    const submitted = ++version;
    const hasQuery = q !== '' || tags.length > 0;
    results.replaceChildren();
    results.hidden = true;
    status.textContent = hasQuery ? 'Ищем авторов…' : '';
    if (!hasQuery) {
      return;
    }

    try {
      const page = await searchAuthors(q, tags);
      if (version !== submitted) {
        return;
      }
      results.innerHTML = page.items.map((author) => authorResultTemplate({
        ...author,
        href: publicProfileRoute(author.username),
        initials: author.nickname.trim().split(/\s+/u).slice(0, 2)
          .map((part) => [...part][0] ?? '').join('').toUpperCase(),
      })).join('');
      results.hidden = page.items.length === 0;
      status.textContent = page.items.length ? '' : 'Авторы не найдены';
    } catch {
      if (version === submitted) {
        status.textContent = 'Не удалось найти авторов. Попробуйте ещё раз';
      }
    }
  }

  form.addEventListener('submit', (event) => {
    event.preventDefault();
    q = input.value.trim();
    void search();
  }, { signal });

  if (authStore.getState().status === 'unknown') {
    void checkSession().catch(() => {});
  }
  return () => {
    version += 1;
    events.abort();
  };
}
