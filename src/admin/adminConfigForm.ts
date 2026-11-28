import '@/components/formField/formField.css';
import { ApiError } from '@/modules/api/apiError.ts';
import { createOnlineConfConfig, getOnlineConfConfig, updateOnlineConfConfig } from '@/modules/api/onlineConf.ts';
import type { OnlineConfConfigKey, OnlineConfJsonValue } from '@/modules/api/onlineConf.types.ts';
import { setFieldError, setFormError } from '@/modules/validation/bindForm.ts';
import { requireElement } from '@/utils/helpers/dom.ts';
import { ADMIN_CONFIG_FORM_TEXT as TEXT } from './admin.constants.ts';
import type { AdminScreen } from './admin.types.ts';
import formTemplate from './adminConfigForm.hbs';

export function initAdminConfigForm(
  root: HTMLElement,
  sourceScope: HTMLSelectElement,
  onSaved: () => void,
  onAccessLost: (screen: AdminScreen) => void,
) {
  let active: AbortController | undefined;

  function close(): void {
    active?.abort();
    active = undefined;
    root.hidden = true;
    root.replaceChildren();
  }

  function showMessage(text: string): void {
    const message = document.createElement('p');
    message.textContent = text;
    root.replaceChildren(message);
  }

  function handleAccessError(error: unknown): boolean {
    if (error instanceof ApiError && !error.isCsrfError && (error.isUnauthorized || error.status === 403)) {
      onAccessLost(error.isUnauthorized ? 'guest' : 'forbidden');
      return true;
    }
    return false;
  }

  async function open(key?: OnlineConfConfigKey): Promise<void> {
    close();
    const controller = new AbortController();
    active = controller;
    const { signal } = controller;
    root.hidden = false;
    const selectedScope = key?.scope ?? sourceScope.value;
    let initialValue = '';
    let description: string | undefined;

    if (key) {
      showMessage(TEXT.loading);
      try {
        const config = await getOnlineConfConfig(key, signal);
        initialValue = JSON.stringify(config.value, null, 2);
        description = config.description;
      } catch (error) {
        if (!signal.aborted && !handleAccessError(error)) {
          showMessage(TEXT.loadError);
        }
        return;
      }
    }
    if (signal.aborted) {
      return;
    }

    root.innerHTML = formTemplate({
      title: key ? TEXT.editTitle : TEXT.createTitle,
      editing: !!key,
      name: key?.name,
      value: initialValue,
      scopes: Array.from(sourceScope.options, ({ value, text }) => ({ id: value, name: text, selected: value === selectedScope })),
    });
    const form = requireElement<HTMLFormElement>(root, 'form');
    const submit = requireElement<HTMLButtonElement>(form, 'button[type="submit"]');
    requireElement<HTMLButtonElement>(form, '[data-cancel-config]').addEventListener('click', close, { signal });
    requireElement<HTMLElement>(form, key ? '#admin-config-value' : '#admin-config-name').focus();

    form.addEventListener('submit', async (event) => {
      event.preventDefault();
      if (submit.disabled) {
        return;
      }
      const fields = new FormData(form);
      const name = String(fields.get('name') ?? '').trim();
      setFormError(form, null);
      setFieldError(form, 'name', key || name ? null : TEXT.invalidName);
      let value: OnlineConfJsonValue;
      try {
        value = JSON.parse(String(fields.get('value') ?? ''), (_field, item: OnlineConfJsonValue) => {
          if (typeof item === 'number' && !Number.isFinite(item)) {
            throw new RangeError();
          }
          return item;
        }) as OnlineConfJsonValue;
      } catch {
        setFieldError(form, 'value', TEXT.invalidJson);
        return;
      }
      setFieldError(form, 'value', null);
      if (!key && !name) {
        return;
      }
      submit.disabled = true;
      form.inert = true;
      try {
        if (key) {
          await updateOnlineConfConfig(key, value, description, signal);
        } else {
          const scope = String(fields.get('scope') ?? selectedScope);
          await createOnlineConfConfig({ name, scope, value }, signal);
        }
        if (!signal.aborted) {
          close();
          onSaved();
        }
      } catch (error) {
        if (signal.aborted || handleAccessError(error)) {
          return;
        }
        if (!key && error instanceof ApiError && error.status === 409) {
          setFieldError(form, 'name', TEXT.alreadyExists);
        } else {
          setFormError(form, error instanceof ApiError && (error.isCsrfError || error.isMutationTimeout) ? error.text : TEXT.saveError);
        }
      } finally {
        if (!signal.aborted) {
          submit.disabled = false;
          form.inert = false;
        }
      }
    }, { signal });
  }

  return { open, close };
}
