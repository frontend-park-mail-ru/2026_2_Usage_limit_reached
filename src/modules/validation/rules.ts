import type { Rule } from './validation.types.ts';

/**
 * @param message
 */
export const required = (message = 'Обязательное поле'): Rule =>
  (value) => (value.trim() !== '' ? null : message);

/**
 * Минимальная длина строки.
 * @param min
 * @param message
 */
export const minLength = (min: number, message = `Минимум ${min} символов`): Rule =>
  (value) => ([...value].length >= min ? null : message);

/**
 * Максимальная длина строки.
 * @param max
 * @param message
 */
export const maxLength = (max: number, message = `Максимум ${max} символов`): Rule =>
  (value) => ([...value].length <= max ? null : message);

/**
 * Проверяет длину строки в байтах UTF-8.
 * @param max
 * @param message
 */
export const maxByteLength = (max: number, message: string): Rule =>
  (value) => (new TextEncoder().encode(value).length <= max ? null : message);

/**
 * Значение должно соответствовать регулярному выражению.
 * @param regexp
 * @param message
 */
export const pattern = (regexp: RegExp, message: string): Rule =>
  (value) => (regexp.test(value) ? null : message);

export const email: Rule = pattern(/^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/, 'Введите корректный адрес электронной почты');

/**
 * Значение должно совпадать со значением другого поля формы.
 * @param field
 * @param message
 */
export const sameAs = (field: string, message: string): Rule =>
  (value, values = {}) => (value === values[field] ? null : message);
