import { validate } from './validate.js';
import type { Schema } from './validate.js';
import type { FormValues } from './rules.js';

const INVALID_CLASS = 'form-field__input--invalid';

const getValues = (form: HTMLFormElement) => Object.fromEntries(new FormData(form)) as FormValues;

/**
 * Показывает ошибку под полем или убирает её.
 * @param error - null убирает сообщение.
 */
export const setFieldError = (form: HTMLFormElement, name: string, error: string | null) => {
  const input = form.elements.namedItem(name);
  const errorEl = form.querySelector(`[data-error-for="${name}"]`);
  if (!(input instanceof HTMLElement) || !errorEl) return;

  input.classList.toggle(INVALID_CLASS, !!error);
  input.setAttribute('aria-invalid', String(!!error));
  errorEl.textContent = error ?? '';
};

export const showErrors = (form: HTMLFormElement, errors: Record<string, string>) => {
  for (const [name, error] of Object.entries(errors)) {
    setFieldError(form, name, error);
  }
};

/** Показывает общую ошибку формы; null убирает сообщение. */
export const setFormError = (form: HTMLFormElement, error: string | null, kind: 'data' | 'server' = 'server'): void => {
  const errorEl = form.querySelector<HTMLElement>('[data-form-error]');
  if (!errorEl) return;

  errorEl.textContent = error ?? '';
  if (error) {
    errorEl.dataset.errorKind = kind;
  } else {
    delete errorEl.dataset.errorKind;
  }
};

/**
 * Подключает проверку формы. После первой попытки отправки
 * ошибки обновляются при вводе.
 * Общие ошибки категории "data" сбрасываются при вводе.
 */
export const bindValidation = (form: HTMLFormElement, schema: Schema, onSubmit: (values: FormValues) => void): void => {
  let hasSubmitted = false;

  const updateErrors = (values: FormValues): boolean => {
    const { isValid, errors } = validate(values, schema);
    for (const name of Object.keys(schema)) {
      setFieldError(form, name, errors[name] ?? null);
    }
    return isValid;
  };

  form.addEventListener('input', () => {
    const errorEl = form.querySelector<HTMLElement>('[data-form-error]');
    if (errorEl?.dataset.errorKind === 'data') {
      setFormError(form, null);
    }
    if (hasSubmitted) {
      updateErrors(getValues(form));
    }
  });

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    hasSubmitted = true;
    const values = getValues(form);

    if (!updateErrors(values)) {
      form.querySelector<HTMLElement>(`.${INVALID_CLASS}`)?.focus();
      return;
    }
    onSubmit(values);
  });
};
