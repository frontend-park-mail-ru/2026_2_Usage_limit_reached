/**
 * @file Связывает схему валидации с HTML-формой:
 * берёт значения из полей, проверяет их и показывает ошибки под полями.
 * Контракт разметки: name у поля = ключ схемы,
 * текст ошибки выводится в элемент [data-error-for="<name>"],
 * общая ошибка формы — в элемент [data-form-error].
 */

import { validate, validateField } from './validate.js';

/** Класс, которым помечается поле с ошибкой. */
const INVALID_CLASS = 'form-field__input--invalid';

/**
 * Собирает значения всех полей формы.
 * @param {HTMLFormElement} form - форма
 * @returns {Object<string, string>} имя поля → значение
 */
const getValues = (form) => Object.fromEntries(new FormData(form));

/**
 * Показывает ошибку под полем или убирает её.
 * @param {HTMLFormElement} form - форма
 * @param {string} name - имя поля
 * @param {string|null} error - текст ошибки или null, если ошибки нет
 */
export const setFieldError = (form, name, error) => {
  const input = form.elements.namedItem(name);
  const errorEl = form.querySelector(`[data-error-for="${name}"]`);
  if (!input || !errorEl) return;

  input.classList.toggle(INVALID_CLASS, Boolean(error));
  input.setAttribute('aria-invalid', String(Boolean(error)));
  errorEl.textContent = error ?? '';
};

/**
 * Показывает ошибки под несколькими полями, например пришедшие с сервера.
 * @param {HTMLFormElement} form - форма
 * @param {Object<string, string>} errors - имя поля → текст ошибки
 */
export const showErrors = (form, errors) => {
  for (const [name, error] of Object.entries(errors)) {
    setFieldError(form, name, error);
  }
};

/**
 * Показывает общую ошибку формы, не привязанную к полю
 * (например, «сервер недоступен»), или убирает её.
 * @param {HTMLFormElement} form - форма
 * @param {string|null} error - текст ошибки или null, если ошибки нет
 */
export const setFormError = (form, error) => {
  const errorEl = form.querySelector('[data-form-error]');
  if (!errorEl) return;

  errorEl.textContent = error ?? '';
};

/**
 * Подключает валидацию к форме.
 * Ошибки появляются при отправке, а при вводе исчезают,
 * как только значение в красном поле становится верным.
 * @param {HTMLFormElement} form - форма
 * @param {import('./schemas.js').Schema} schema - схема формы
 * @param {(values: Object<string, string>) => void} onSubmit - вызывается, если все поля верны
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
