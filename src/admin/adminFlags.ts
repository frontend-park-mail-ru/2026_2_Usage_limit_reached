import { requireElement } from '@/utils/helpers/dom.ts';
import { ApiError } from '@/modules/api/apiError.ts';
import { createOnlineConfFlag, updateOnlineConfFlag } from '@/modules/api/onlineConf.ts';
import type { OnlineConfFlag, OnlineConfFlagUpdate, OnlineConfListItem } from '@/modules/api/onlineConf.types.ts';
import type { AdminScreen } from './admin.types.ts';
import { bindFlagOverrides, FLAG_OVERRIDES } from './adminFlagOverrides.ts';
import listTemplate from './adminFlags.hbs';
import formTemplate from './adminFlagForm.hbs';
import './adminFlags.css';

function isFlag(item: OnlineConfListItem): item is OnlineConfFlag {
  return 'id' in item && typeof item.id === 'string' && item.id !== ''
    && 'rollout_percent' in item && typeof item.rollout_percent === 'number';
}

/** Показывает список флагов и форму выбранного действия. */
export function renderFlagList(
  root: HTMLElement,
  items: OnlineConfListItem[],
  scope: HTMLSelectElement,
  reload: () => Promise<void>,
  onAccessLost: (screen: AdminScreen) => void,
  signal: AbortSignal,
  lockTabs: (locked: boolean) => void,
): void {
  root.innerHTML = listTemplate({ items: items.map((item) => ({ ...item, editable: isFlag(item) })) });
  const list = requireElement<HTMLElement>(root, '[data-flag-list]');
  const editor = requireElement<HTMLElement>(root, '[data-flag-editor]');

  function open(trigger: HTMLButtonElement, flag?: OnlineConfFlag): void {
    list.hidden = true;
    editor.innerHTML = formTemplate({ ...flag, editing: Boolean(flag), overrides: FLAG_OVERRIDES });
    const form = requireElement<HTMLFormElement>(editor, 'form');
    const overrides = bindFlagOverrides(form, flag);
    const name = requireElement<HTMLInputElement>(form, '[name="name"]');
    const scopes = requireElement<HTMLSelectElement>(form, '[name="scope"]');
    const rollout = requireElement<HTMLInputElement>(form, '[name="rollout_percent"]');
    const error = requireElement<HTMLElement>(form, '#admin-flag-rollout-error');
    const saveError = requireElement<HTMLElement>(form, '[data-flag-save-error]');
    const submit = requireElement<HTMLButtonElement>(form, '[type="submit"]');
    const cancel = requireElement<HTMLButtonElement>(form, '[data-flag-cancel]');
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
    const close = () => {
      editor.replaceChildren();
      list.hidden = false;
      trigger.focus();
    };
    cancel.addEventListener('click', close);
    const current = () => form.isConnected && !signal.aborted;
    form.addEventListener('submit', async (event) => {
      event.preventDefault();
      if (submit.disabled || !current()) {
        return;
      }
      validateRollout();
      if (!overrides.validate()) {
        return;
      }
      name.setCustomValidity(name.value.trim() ? '' : 'Укажите имя флага');
      if (!form.reportValidity()) {
        return;
      }
      const percent = Number(rollout.value);
      const data: OnlineConfFlagUpdate = overrides.values(Boolean(flag));
      if (flag?.rollout_percent !== percent) {
        data.rollout_percent = percent;
      }
      if (flag && Object.keys(data).length === 0) {
        close();
        return;
      }
      const label = submit.textContent;
      const setSaving = (saving: boolean) => {
        submit.disabled = cancel.disabled = rollout.disabled = saving;
        name.disabled = saving;
        scopes.disabled = saving || Boolean(flag);
        overrides.setSaving(saving);
        submit.textContent = saving ? 'Сохраняем…' : label;
      };
      saveError.hidden = true;
      setSaving(true);
      lockTabs(true);
      try {
        if (flag) {
          await updateOnlineConfFlag(flag.id, data, signal);
        } else {
          await createOnlineConfFlag({ ...data, scope: scopes.value, name: name.value.trim(), rollout_percent: percent }, signal);
        }
        if (current()) {
          await reload();
        }
      } catch (err) {
        if (!current()) {
          return;
        }
        if (err instanceof ApiError && !err.isCsrfError && (err.isUnauthorized || err.status === 403)) {
          onAccessLost(err.isUnauthorized ? 'guest' : 'forbidden');
          return;
        }
        saveError.textContent = err instanceof ApiError && err.isMutationTimeout
          ? err.text : 'Не удалось сохранить флаг. Попробуйте ещё раз';
        saveError.hidden = false;
      } finally {
        lockTabs(false);
        if (current()) {
          setSaving(false);
        }
      }
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
