import { requireElement } from '@/utils/helpers/dom.ts';
import type { OnlineConfJsonValue, OnlineConfSection } from '@/modules/api/onlineConf.types.ts';
import template from './adminHistory.hbs';
import './adminHistory.css';

export interface AdminHistoryResource {
  section: OnlineConfSection;
  scope: string;
  name: string;
  id?: string;
}

export interface AdminHistoryEntry {
  actor: string;
  date: string;
  changes: { field: string; before?: OnlineConfJsonValue; after?: OnlineConfJsonValue }[];
}

export type LoadAdminHistory = (resource: AdminHistoryResource, signal: AbortSignal) => Promise<AdminHistoryEntry[]>;

const dateFormat = new Intl.DateTimeFormat('ru-RU', { dateStyle: 'medium', timeStyle: 'short' });
const formatValue = (value: OnlineConfJsonValue | undefined) =>
  value === undefined ? undefined : JSON.stringify(value, null, 2);

/** Подключает экран истории к контейнеру раздела. */
export function initAdminHistory(root: HTMLElement, loadHistory?: LoadAdminHistory) {
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

    async function load(): Promise<void> {
      pending?.abort();
      if (!loadHistory) {
        status.textContent = 'История пока недоступна';
        return;
      }
      const controller = new AbortController();
      pending = controller;
      retry.hidden = true;
      entriesRoot.replaceChildren();
      status.textContent = 'Загружаем историю…';
      try {
        const entries = await loadHistory(resource, controller.signal);
        if (controller.signal.aborted) {
          return;
        }
        status.textContent = entries.length ? '' : 'Изменений пока нет';
        for (const { actor, date, changes } of entries) {
          const entry = document.createElement('li');
          const author = document.createElement('strong');
          const time = document.createElement('time');
          const parsedDate = new Date(date);
          author.textContent = actor;
          time.dateTime = date;
          time.textContent = Number.isNaN(parsedDate.getTime()) ? date : dateFormat.format(parsedDate);
          entry.append(author, time);
          const fields = document.createElement('dl');
          for (const { field, before, after } of changes) {
            const heading = document.createElement('dt');
            heading.textContent = field;
            fields.append(heading);
            for (const [label, value] of [['До', formatValue(before)], ['После', formatValue(after)]]) {
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
      } catch {
        if (!controller.signal.aborted) {
          status.textContent = 'Не удалось загрузить историю';
          retry.hidden = false;
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
    back.focus();
    void load();
  }

  return { open, close };
}
