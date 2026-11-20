import searchTemplate from './search.hbs';
import authorResultTemplate from './authorResult.hbs';
import { publicProfileRoute } from '@/app/paths.ts';
import { searchAuthors } from '@/modules/api/authors.ts';
import { checkSession } from '@/modules/auth/auth.actions.ts';
import { authStore } from '@/modules/auth/auth.store.ts';
import { requireElement } from '@/utils/helpers/dom.ts';

/** Показывает форму поиска авторов. */
export function renderSearch(): string {
  return searchTemplate({});
}

/** Подключает поиск и отключает его при уходе со страницы. */
export function initSearch(root: HTMLElement): () => void {
  const form = requireElement<HTMLFormElement>(root, '.author-search__form');
  const input = requireElement<HTMLInputElement>(form, '#author-query');
  const status = requireElement<HTMLElement>(root, '[data-search-status]');
  const results = requireElement<HTMLUListElement>(root, '[data-search-results]');
  const events = new AbortController();
  let version = 0;

  results.addEventListener('error', (event) => {
    if (event.target instanceof HTMLImageElement) {
      event.target.remove();
    }
  }, { capture: true, signal: events.signal });

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    const submitted = ++version;
    const q = input.value.trim();
    results.replaceChildren();
    results.hidden = true;
    status.textContent = q ? 'Ищем авторов…' : '';
    if (!q) {
      return;
    }

    try {
      const page = await searchAuthors(q);
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
  }, { signal: events.signal });

  if (authStore.getState().status === 'unknown') {
    void checkSession().catch(() => {});
  }
  return () => {
    version += 1;
    events.abort();
  };
}
