import { validate, validateField } from './validate.js';

const INVALID_CLASS = 'form-field__input--invalid';

/**
 * Собирает значения всех полей формы.
 * @param {HTMLFormElement} form
 * @returns {Object<string, string>}
 */
const getValues = (form) => Object.fromEntries(new FormData(form));

/**
 * Показывает ошибку под полем или убирает её.
 * @param {HTMLFormElement} form
 * @param {string} name
 * @param {string|null} error
 */
export const setFieldError = (form, name, error) => {
  const input = form.elements.namedItem(name);
  const errorEl = form.querySelector(`[data-error-for="${name}"]`);
  if (!input || !errorEl) return;

  input.classList.toggle(INVALID_CLASS, !!error);
  input.setAttribute('aria-invalid', String(!!error));
  errorEl.textContent = error ?? '';
};

/**
 * Показывает ошибки под несколькими полями.
 * @param {HTMLFormElement} form
 * @param {Object<string, string>} errors
 */
export const showErrors = (form, errors) => {
  for (const [name, error] of Object.entries(errors)) {
    setFieldError(form, name, error);
  }
};

/**
 * Показывает общую ошибку формы, не привязанную к полю
 * или убирает её.
 * @param {HTMLFormElement} form
 * @param {string|null} error
 */
export const setFormError = (form, error) => {
  const errorEl = form.querySelector('[data-form-error]');
  if (!errorEl) return;

  errorEl.textContent = error ?? '';
};

/**
 * Подключает валидацию к форме.
 * @param {HTMLFormElement} form
 * @param {Schema} schema
 * @param {(values: Object<string, string>) => void} onSubmit
 */
export const bindValidation = (form, schema, onSubmit) => {
  form.addEventListener('input', () => {
    const values = getValues(form);
    for (const input of form.querySelectorAll(`.${INVALID_CLASS}`)) {
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
      form.querySelector(`.${INVALID_CLASS}`)?.focus();
      return;
    }
    onSubmit(values);
  });
};
