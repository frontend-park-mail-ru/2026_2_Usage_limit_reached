import { requireElement } from '@/utils/helpers/dom.ts';
import { ApiError } from '@/modules/api/apiError.ts';
import { getOnlineConfHistory } from '@/modules/api/onlineConf.ts';
import type { OnlineConfJsonValue, OnlineConfSection } from '@/modules/api/onlineConf.types.ts';
import type { AdminScreen } from './admin.types.ts';
import template from './adminHistory.hbs';
import './adminHistory.css';

interface AdminHistoryResource {
  section: OnlineConfSection;
  scope: string;
  name: string;
}

const dateFormat = new Intl.DateTimeFormat('ru-RU', { dateStyle: 'medium', timeStyle: 'short' });
function formatValue(value: OnlineConfJsonValue | undefined, encoded: boolean): string | undefined {
  if (encoded && typeof value === 'string') {
    try {
      return JSON.stringify(JSON.parse(value), null, 2);
    } catch {
      return JSON.stringify(value);
    }
  }
  return value === undefined ? undefined : JSON.stringify(value, null, 2);
}

function snapshot(value: OnlineConfJsonValue | undefined): Record<string, OnlineConfJsonValue> {
  if (value === undefined) {
    return {};
  }
  return value !== null && typeof value === 'object' && !Array.isArray(value) ? value : { value };
}

/** Подключает экран истории к контейнеру раздела. */
export function initAdminHistory(root: HTMLElement, onAccessLost: (screen: AdminScreen) => void) {
  let pending: AbortController | undefined;

  function close(): void {
    pending?.abort();
    pending = undefined;
    root.hidden = true;
    root.replaceChildren();
  }

  function open(resource: AdminHistoryResource, trigger: HTMLButtonElement): void {
    close();
    root.innerHTML = template({ ...resource, config: resource.section === 'configs' });
    root.hidden = false;
    const back = requireElement<HTMLButtonElement>(root, '[data-history-back]');
    const status = requireElement<HTMLElement>(root, '[data-history-status]');
    const retry = requireElement<HTMLButtonElement>(root, '[data-history-retry]');
    const entriesRoot = requireElement<HTMLElement>(root, '[data-history-entries]');
    const more = requireElement<HTMLButtonElement>(root, '[data-history-more]');
    let cursor: string | undefined;

    async function load(): Promise<void> {
      if (pending) {
        return;
      }
      const controller = new AbortController();
      pending = controller;
      retry.hidden = true;
      more.hidden = true;
      status.textContent = 'Загружаем историю…';
      try {
        const page = await getOnlineConfHistory(resource.section, resource.scope, resource.name, controller.signal, cursor);
        if (controller.signal.aborted) {
          return;
        }
        status.textContent = page.items.length || entriesRoot.childElementCount ? '' : 'Изменений пока нет';
        for (const { actor_id, created_at, old_value, new_value, action } of page.items) {
          const entry = document.createElement('li');
          const author = document.createElement('strong');
          const time = document.createElement('time');
          const parsedDate = new Date(created_at);
          author.textContent = actor_id || 'Автор неизвестен';
          time.dateTime = created_at;
          time.textContent = Number.isNaN(parsedDate.getTime()) ? created_at : dateFormat.format(parsedDate);
          entry.append(author, time);
          const fields = document.createElement('dl');
          const before = snapshot(old_value);
          const after = snapshot(new_value);
          for (const field of new Set([...Object.keys(before), ...Object.keys(after)])) {
            const encoded = resource.section === 'configs' && field === 'value';
            const oldText = formatValue(Object.hasOwn(before, field) ? before[field] : undefined, encoded);
            const newText = formatValue(Object.hasOwn(after, field) ? after[field] : undefined, encoded);
            if (oldText === newText) {
              continue;
            }
            const heading = document.createElement('dt');
            heading.textContent = field;
            fields.append(heading);
            for (const [label, value] of [['До', oldText], [action === 'create' ? 'Значение' : 'После', newText]]) {
              if (value === undefined) {
                continue;
              }
              const detail = document.createElement('dd');
              const code = document.createElement('pre');
              code.textContent = value;
              detail.append(label ?? '', code);
              fields.append(detail);
            }
          }
          entry.append(fields);
          entriesRoot.append(entry);
        }
        cursor = page.cursor;
        more.hidden = !cursor;
      } catch (error) {
        if (controller.signal.aborted) {
          return;
        }
        if (error instanceof ApiError && (error.isUnauthorized || error.status === 403)) {
          onAccessLost(error.isUnauthorized ? 'guest' : 'forbidden');
          return;
        }
        status.textContent = 'Не удалось загрузить историю';
        retry.hidden = false;
      } finally {
        if (pending === controller) {
          pending = undefined;
        }
      }
    }

    back.onclick = () => {
      close();
      trigger.focus();
    };
    retry.onclick = () => {
      back.focus();
      void load();
    };
    more.onclick = retry.onclick;
    back.focus();
    void load();
  }

  return { open, close };
}
