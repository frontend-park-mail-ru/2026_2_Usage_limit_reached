import { requireElement } from '@/utils/helpers/dom.ts';
import type { OnlineConfListItem } from '@/modules/api/onlineConf.types.ts';
import listTemplate from './adminFlags.hbs';
import formTemplate from './adminFlagForm.hbs';
import './adminFlags.css';

interface FlagListItem extends OnlineConfListItem {
  id: string;
  rollout_percent: number;
}

function isFlag(item: OnlineConfListItem): item is FlagListItem {
  return 'id' in item && typeof item.id === 'string' && item.id !== ''
    && 'rollout_percent' in item && typeof item.rollout_percent === 'number';
}

/** Показывает список флагов и форму выбранного действия. */
export function renderFlagList(root: HTMLElement, items: OnlineConfListItem[], scope: HTMLSelectElement): void {
  root.innerHTML = listTemplate({ items: items.map((item) => ({ ...item, editable: isFlag(item) })) });
  const list = requireElement<HTMLElement>(root, '[data-flag-list]');
  const editor = requireElement<HTMLElement>(root, '[data-flag-editor]');

  function open(trigger: HTMLButtonElement, flag?: FlagListItem): void {
    list.hidden = true;
    editor.innerHTML = formTemplate({ ...flag, editing: Boolean(flag) });
    const form = requireElement<HTMLFormElement>(editor, 'form');
    const name = requireElement<HTMLInputElement>(form, '[name="name"]');
    const scopes = requireElement<HTMLSelectElement>(form, '[name="scope"]');
    const rollout = requireElement<HTMLInputElement>(form, '[name="rollout_percent"]');
    const error = requireElement<HTMLElement>(form, '#admin-flag-rollout-error');
    scopes.replaceChildren(...Array.from(scope.options, (option) => new Option(option.text, option.value)));
    scopes.value = scope.value;

    const validateRollout = () => {
      const value = rollout.value.trim();
      const message = !value ? 'Укажите процент раскатки'
        : !/^\d+$/.test(value) || Number(value) > 100 ? 'Введите целое число от 0 до 100' : '';
      rollout.setCustomValidity(message);
      rollout.setAttribute('aria-invalid', String(Boolean(message)));
      error.textContent = message;
      error.hidden = !message;
    };
    rollout.addEventListener('blur', validateRollout);
    rollout.addEventListener('input', validateRollout);
    form.addEventListener('submit', (event) => {
      event.preventDefault();
      validateRollout();
    });
    requireElement(form, '[data-flag-cancel]').addEventListener('click', () => {
      editor.replaceChildren();
      list.hidden = false;
      trigger.focus();
    });
    (flag ? rollout : name).focus();
  }

  const create = requireElement<HTMLButtonElement>(list, '[data-flag-create]');
  create.addEventListener('click', () => open(create));
  list.querySelectorAll<HTMLButtonElement>('[data-flag-edit]').forEach((button) => {
    const item = items[Number(button.dataset.flagEdit)];
    if (item && isFlag(item)) {
      button.addEventListener('click', () => open(button, item));
    }
  });
}
