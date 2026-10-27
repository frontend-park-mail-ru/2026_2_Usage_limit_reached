import { validate, validateField } from './validate.js';
import type { FormValues, Schema } from './validation.types.js';
import { INVALID_CLASS } from './bindForm.constants.js';

const getValues = (form: HTMLFormElement) => Object.fromEntries(new FormData(form)) as FormValues;

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

export const setFormError = (form: HTMLFormElement, error: string | null) => {
  const errorEl = form.querySelector('[data-form-error]');
  if (!errorEl) return;

  errorEl.textContent = error ?? '';
};

export const bindValidation = (form: HTMLFormElement, schema: Schema, onSubmit: (values: FormValues) => void) => {
  form.addEventListener('input', () => {
    const values = getValues(form);
    for (const input of form.querySelectorAll<HTMLInputElement>(`.${INVALID_CLASS}`)) {
      setFieldError(form, input.name, validateField(input.name, values, schema));
    }
  });

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const values = getValues(form);
    const { isValid, errors } = validate(values, schema);

    for (const name of Object.keys(schema)) {
      setFieldError(form, name, errors[name] ?? null);
    }
    if (!isValid) {
      form.querySelector<HTMLElement>(`.${INVALID_CLASS}`)?.focus();
      return;
    }
    onSubmit(values);
  });
};
