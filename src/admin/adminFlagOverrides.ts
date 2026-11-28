import { requireElement } from '@/utils/helpers/dom.ts';
import type { OnlineConfFlagOverrides } from '@/modules/api/onlineConf.types.ts';

export const FLAG_OVERRIDES = [
  { key: 'include_user_ids', label: 'Включить принудительно' },
  { key: 'exclude_user_ids', label: 'Исключить из раскатки' },
] as const;

/** Подключает поля ID к форме флага. */
export function bindFlagOverrides(form: HTMLFormElement, initial: OnlineConfFlagOverrides = {}) {
  const fields = FLAG_OVERRIDES.map(({ key }) => {
    const group = requireElement<HTMLFieldSetElement>(form, `[data-override="${key}"]`);
    const ids = new Set(initial[key]);
    return {
      key, group, ids,
      input: requireElement<HTMLInputElement>(group, 'input'),
      error: requireElement<HTMLElement>(group, '[aria-live]'),
      list: requireElement<HTMLUListElement>(group, 'ul'),
      add: requireElement<HTMLButtonElement>(group, '[data-add-user]'),
    };
  });

  const validate = (saving = false) => {
    for (const [index, field] of fields.entries()) {
      const other = fields[1 - index].ids;
      const value = field.input.value.trim();
      let message = '';
      if ([...field.ids].some((id) => other.has(id)) || other.has(value)) {
        message = 'Этот пользователь уже есть в другом списке';
      } else if (field.ids.has(value)) {
        message = 'Этот пользователь уже есть в списке';
      } else if (saving && value) {
        message = 'Добавьте пользователя или очистите поле';
      }
      field.input.setCustomValidity(message);
      field.input.setAttribute('aria-invalid', String(Boolean(message)));
      field.error.textContent = message;
      field.error.hidden = !message;
    }
  };

  for (const field of fields) {
    const render = () => {
      field.list.replaceChildren(...[...field.ids].map((id) => {
        const item = document.createElement('li');
        const label = document.createElement('span');
        const remove = document.createElement('button');
        label.textContent = id;
        remove.type = 'button';
        remove.className = 'button button_view_secondary';
        remove.textContent = 'Удалить';
        remove.setAttribute('aria-label', `Удалить пользователя ${id}`);
        remove.addEventListener('click', () => {
          field.ids.delete(id);
          render();
          validate();
          field.input.focus();
        });
        item.append(label, remove);
        return item;
      }));
    };
    const add = () => {
      const value = field.input.value.trim();
      const other = fields.find((candidate) => candidate !== field);
      if (value && !field.ids.has(value) && !other?.ids.has(value)) {
        field.ids.add(value);
        field.input.value = '';
        render();
      }
      validate();
      field.input.focus();
    };
    field.add.addEventListener('click', add);
    field.input.addEventListener('input', () => validate());
    field.input.addEventListener('keydown', (event) => {
      if (event.key === 'Enter' && !event.isComposing) {
        event.preventDefault();
        add();
      }
    });
    render();
  }
  validate();

  return {
    validate: () => {
      validate(true);
      const invalid = fields.find(({ input }) => !input.validity.valid);
      invalid?.input.focus();
      return !invalid;
    },
    values: (changedOnly: boolean): OnlineConfFlagOverrides => {
      const result: OnlineConfFlagOverrides = {};
      for (const { key, ids } of fields) {
        const saved = initial[key] ?? [];
        if (!changedOnly || ids.size !== saved.length || !saved.every((id) => ids.has(id))) {
          result[key] = [...ids];
        }
      }
      return result;
    },
    setSaving: (saving: boolean) => fields.forEach(({ group }) => { group.disabled = saving; }),
  };
}
