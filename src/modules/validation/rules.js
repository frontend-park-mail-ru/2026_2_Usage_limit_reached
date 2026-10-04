/**
 * Правило валидации.
 * @callback Rule
 * @param {string} value
 * @param {Object<string, string>} [values]
 * @returns {string|null}
 */

/**
 * Поле не должно быть пустым
 * @param {string} [message]
 * @returns {Rule}
 */
export const required = (message = 'Обязательное поле') =>
  (value) => (value.trim() !== '' ? null : message);

/**
 * Минимальная длина строки.
 * @param {number} min
 * @param {string} [message]
 * @returns {Rule}
 */
export const minLength = (min, message = `Минимум ${min} символов`) =>
  (value) => (value.length >= min ? null : message);

/**
 * Максимальная длина строки.
 * @param {number} max
 * @param {string} [message]
 * @returns {Rule}
 */
export const maxLength = (max, message = `Максимум ${max} символов`) =>
  (value) => (value.length <= max ? null : message);

/**
 * Значение должно соответствовать регулярному выражению.
 * @param {RegExp} regexp
 * @param {string} message
 * @returns {Rule}
 */
export const pattern = (regexp, message) =>
  (value) => (regexp.test(value) ? null : message);

/**
 * Проверка формата email
 * @type {Rule}
 */
export const email = pattern(/^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/, 'Некорректный email');

/**
 * Значение должно совпадать со значением другого поля формы.
 * @param {string} field
 * @param {string} message
 * @returns {Rule}
 */
export const sameAs = (field, message) =>
  (value, values = {}) => (value === values[field] ? null : message);
