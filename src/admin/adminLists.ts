import '@/components/tabs/tabs.css';
import { Tabs } from '@/components/tabs/tabs.ts';
import { ApiError } from '@/modules/api/apiError.ts';
import { getOnlineConfList, getOnlineConfScopes } from '@/modules/api/onlineConf.ts';
import type { OnlineConfSection } from '@/modules/api/onlineConf.types.ts';
import { requireElement } from '@/utils/helpers/dom.ts';
import { ADMIN_LIST_MESSAGES, ADMIN_LIST_TABS } from './admin.constants.ts';
import type { AdminScreen } from './admin.types.ts';
import listTemplate from './adminList.hbs';
import { initAdminConfigForm } from './adminConfigForm.ts';
import { renderFlagList } from './adminFlags.ts';
import { initAdminHistory } from './adminHistory.ts';

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
  const configActions = requireElement<HTMLElement>(panel, '[data-config-actions]');
  const createConfig = requireElement<HTMLButtonElement>(configActions, '[data-create-config]');
  const configFormRoot = requireElement<HTMLElement>(panel, '#admin-config-form');
  const events = new AbortController();
  let section: OnlineConfSection = ADMIN_LIST_TABS[0].value;
  let pending: AbortController | undefined;
  const configForm = initAdminConfigForm(configFormRoot, scope, () => void load(), onAccessLost);
  const history = initAdminHistory(requireElement(panel, '#admin-history'), onAccessLost);

  async function load(): Promise<void> {
    history.close();
    pending?.abort();
    const controller = new AbortController();
    pending = controller;
    const { signal } = controller;
    configActions.hidden = section !== 'configs' || scope.disabled;
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
        configActions.hidden = section !== 'configs';
      }
      const response = await getOnlineConfList(section, { scope: scope.value, q: search.value }, signal);
      if (!signal.aborted) {
        if (section === 'flags') {
          renderFlagList(results, response.items, scope, load, onAccessLost, events.signal, (saving) => {
            tabList.inert = saving;
          });
        } else {
          results.innerHTML = listTemplate({ ...response, editable: true });
        }
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
    configForm.close();
    section = tab.value;
    const selectedTab = requireElement<HTMLButtonElement>(tabList, '[aria-selected="true"]');
    panel.setAttribute('aria-labelledby', selectedTab.id);
    void load();
  });
  const options = { signal: events.signal };
  scope.addEventListener('change', () => {
    configForm.close();
    void load();
  }, options);
  search.addEventListener('input', () => void load(), options);
  createConfig.addEventListener('click', () => void configForm.open(), options);
  results.addEventListener('click', (event) => {
    if (!(event.target instanceof Element)) {
      return;
    }
    if (event.target.closest('[data-list-retry]')) {
      void load();
      return;
    }
    const historyButton = event.target.closest<HTMLButtonElement>('[data-history-name]');
    if (historyButton) {
      configForm.close();
      history.open({
        section, scope: scope.value, name: historyButton.dataset.historyName ?? '',
      }, historyButton);
      return;
    }
    const name = event.target.closest<HTMLButtonElement>('[data-edit-config]')?.dataset.editConfig;
    if (name) {
      void configForm.open({ scope: scope.value, name });
    }
  }, options);
  void load();

  return () => {
    events.abort();
    pending?.abort();
    history.close();
    configForm.close();
    tabs.destroy();
  };
}
