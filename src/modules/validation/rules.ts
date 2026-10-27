import type { Rule } from './validation.types.js';

export const required = (message = 'Обязательное поле'): Rule =>
  (value) => (value.trim() !== '' ? null : message);

export const minLength = (min: number, message = `Минимум ${min} символов`): Rule =>
  (value) => ([...value].length >= min ? null : message);

export const maxLength = (max: number, message = `Максимум ${max} символов`): Rule =>
  (value) => ([...value].length <= max ? null : message);

export const maxByteLength = (max: number, message: string): Rule =>
  (value) => (new TextEncoder().encode(value).length <= max ? null : message);

export const pattern = (regexp: RegExp, message: string): Rule =>
  (value) => (regexp.test(value) ? null : message);

export const email: Rule = pattern(/^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/, 'Введите корректный адрес электронной почты');

export const sameAs = (field: string, message: string): Rule =>
  (value, values = {}) => (value === values[field] ? null : message);
