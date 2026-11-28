import { requireElement } from '@/utils/helpers/dom.ts';
import { ApiError } from '@/modules/api/apiError.ts';
import {
  createOnlineConfFlag, getOnlineConfFlag, removeOnlineConfForce, setOnlineConfForce, updateOnlineConfRollout,
} from '@/modules/api/onlineConf.ts';
import type { OnlineConfFlag, OnlineConfFlagOverrides, OnlineConfListItem } from '@/modules/api/onlineConf.types.ts';
import type { AdminScreen } from './admin.types.ts';
import { bindFlagOverrides, FLAG_OVERRIDES } from './adminFlagOverrides.ts';
import listTemplate from './adminFlags.hbs';
import formTemplate from './adminFlagForm.hbs';
import './adminFlags.css';

function isFlag(item: OnlineConfListItem): item is OnlineConfFlag {
  return Boolean(item.name) && 'scope' in item && typeof item.scope === 'string'
    && 'rollout_percent' in item && typeof item.rollout_percent === 'number';
}

function forceByUser(values: OnlineConfFlagOverrides): Map<string, 'on' | 'off'> {
  const result = new Map<string, 'on' | 'off'>();
  values.include_user_ids?.forEach((id) => result.set(id, 'on'));
  values.exclude_user_ids?.forEach((id) => result.set(id, 'off'));
  return result;
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
    scopes.value = flag?.scope ?? scope.value;
    let saved = flag;
    let refreshBeforeSaving = false;
    const initial = forceByUser(flag ?? {});
    const attemptedUsers = new Set<string>();
    let attemptedRollout = false;

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
      const desired = forceByUser(overrides.values());
      const changes = [...new Set([...initial.keys(), ...desired.keys()])]
        .filter((id) => initial.get(id) !== desired.get(id));
      if (flag && flag.rollout_percent === percent && !changes.length && !refreshBeforeSaving) {
        close();
        return;
      }
      const label = submit.textContent;
      const setSaving = (saving: boolean) => {
        submit.disabled = cancel.disabled = rollout.disabled = saving;
        name.disabled = saving;
        scopes.disabled = saving || Boolean(saved);
        name.readOnly = Boolean(saved);
        overrides.setSaving(saving);
        submit.textContent = saving ? 'Сохраняем…' : label;
      };
      saveError.hidden = true;
      setSaving(true);
      lockTabs(true);
      try {
        if (!saved) {
          const created = { scope: scopes.value, name: name.value.trim(), rollout_percent: percent };
          await createOnlineConfFlag(created, signal);
          saved = created;
        } else if (refreshBeforeSaving) {
          saved = await getOnlineConfFlag(saved, signal);
        }
        if (saved.rollout_percent !== percent && (!flag || flag.rollout_percent !== percent || attemptedRollout)) {
          attemptedRollout = true;
          await updateOnlineConfRollout(saved, percent, signal);
        }
        const applied = forceByUser(saved);
        for (const id of new Set([...changes, ...attemptedUsers])) {
          const force = desired.get(id);
          if (force && applied.get(id) !== force) {
            attemptedUsers.add(id);
            await setOnlineConfForce(saved, id, force, signal);
          } else if (!force && applied.has(id)) {
            attemptedUsers.add(id);
            await removeOnlineConfForce(saved, id, signal);
          }
        }
        if (current()) {
          await reload();
        }
      } catch (err) {
        refreshBeforeSaving = Boolean(saved);
        if (!current()) {
          return;
        }
        if (err instanceof ApiError && !err.isCsrfError && (err.isUnauthorized || err.status === 403)) {
          onAccessLost(err.isUnauthorized ? 'guest' : 'forbidden');
          return;
        }
        saveError.textContent = err instanceof ApiError && err.isMutationTimeout
          ? err.text : saved
            ? 'Не удалось сохранить все изменения. Часть могла сохраниться. Попробуйте ещё раз'
            : 'Не удалось создать флаг. Попробуйте ещё раз';
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
