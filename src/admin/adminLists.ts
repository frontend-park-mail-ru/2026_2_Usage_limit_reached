import '@/components/tabs/tabs.css';
import { Tabs } from '@/components/tabs/tabs.ts';
import { ApiError } from '@/modules/api/apiError.ts';
import { getOnlineConfList, getOnlineConfScopes } from '@/modules/api/onlineConf.ts';
import type { OnlineConfSection } from '@/modules/api/onlineConf.types.ts';
import { requireElement } from '@/utils/helpers/dom.ts';
import { ADMIN_LIST_MESSAGES, ADMIN_LIST_TABS } from './admin.constants.ts';
import type { AdminScreen } from './admin.types.ts';
import listTemplate from './adminList.hbs';

/**
 * @param root
 * @param onAccessLost
 */
export function initAdminLists(root: HTMLElement, onAccessLost: (screen: AdminScreen) => void): () => void {
  const tabList = requireElement<HTMLElement>(root, '.admin__tabs');
  const panel = requireElement<HTMLElement>(root, '#onlineconf-panel');
  const scope = requireElement<HTMLSelectElement>(root, '#admin-scope');
  const search = requireElement<HTMLInputElement>(root, '#admin-search');
  const results = requireElement<HTMLElement>(root, '#admin-list-results');
  const events = new AbortController();
  let section: OnlineConfSection = ADMIN_LIST_TABS[0].value;
  let pending: AbortController | undefined;

  async function load(): Promise<void> {
    pending?.abort();
    const controller = new AbortController();
    pending = controller;
    const { signal } = controller;
    results.innerHTML = listTemplate({ message: ADMIN_LIST_MESSAGES.loading });

    try {
      if (scope.disabled) {
        const { items } = await getOnlineConfScopes(signal);
        if (signal.aborted) {
          return;
        }
        if (!items.length) {
          results.innerHTML = listTemplate({ message: ADMIN_LIST_MESSAGES.noScopes });
          return;
        }
        scope.replaceChildren(...items.map(({ id, name }) => new Option(name, id)));
        scope.disabled = false;
        search.disabled = false;
      }
      const response = await getOnlineConfList(section, { scope: scope.value, q: search.value }, signal);
      if (!signal.aborted) {
        results.innerHTML = listTemplate(response);
      }
    } catch (error) {
      if (signal.aborted) {
        return;
      }
      if (error instanceof ApiError && (error.isUnauthorized || error.status === 403)) {
        onAccessLost(error.isUnauthorized ? 'guest' : 'forbidden');
        return;
      }
      const message = scope.disabled ? ADMIN_LIST_MESSAGES.scopesError : ADMIN_LIST_MESSAGES.listError;
      results.innerHTML = listTemplate({ message, retry: true });
    } finally {
      if (pending === controller) {
        pending = undefined;
      }
    }
  }

  const tabs = new Tabs(tabList, (value) => {
    const tab = ADMIN_LIST_TABS.find((item) => item.value === value);
    if (!tab) {
      return;
    }
    section = tab.value;
    const selectedTab = requireElement<HTMLButtonElement>(tabList, '[aria-selected="true"]');
    panel.setAttribute('aria-labelledby', selectedTab.id);
    void load();
  });
  const options = { signal: events.signal };
  scope.addEventListener('change', () => void load(), options);
  search.addEventListener('input', () => void load(), options);
  results.addEventListener('click', (event) => {
    if (event.target instanceof Element && event.target.closest('[data-list-retry]')) {
      void load();
    }
  }, options);
  void load();

  return () => {
    events.abort();
    pending?.abort();
    tabs.destroy();
  };
}
