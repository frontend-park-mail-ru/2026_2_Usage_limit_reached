/**
 * @file Набор правил валидации полей формы.
 * Каждое правило — функция, которая принимает значение поля
 * и возвращает текст ошибки либо null, если значение корректно.
 */

/**
 * Правило валидации.
 * @callback Rule
 * @param {string} value - значение проверяемого поля
 * @param {Object<string, string>} [values] - значения всех полей формы
 * @returns {string|null} текст ошибки или null, если ошибок нет
 */

/**
 * Поле не должно быть пустым (пробелы не считаются).
 * @param {string} [message] - текст ошибки
 * @returns {Rule}
 */
export const required = (message = 'Обязательное поле') =>
  (value) => (value.trim() !== '' ? null : message);

/**
 * Минимальная длина строки.
 * @param {number} min - минимально допустимое количество символов
 * @param {string} [message] - текст ошибки
 * @returns {Rule}
 */
export const minLength = (min, message = `Минимум ${min} символов`) =>
  (value) => (value.length >= min ? null : message);

/**
 * Максимальная длина строки.
 * @param {number} max - максимально допустимое количество символов
 * @param {string} [message] - текст ошибки
 * @returns {Rule}
 */
export const maxLength = (max, message = `Максимум ${max} символов`) =>
  (value) => (value.length <= max ? null : message);

/**
 * Значение должно соответствовать регулярному выражению.
 * @param {RegExp} regexp - шаблон для проверки
 * @param {string} message - текст ошибки
 * @returns {Rule}
 */
export const pattern = (regexp, message) =>
  (value) => (regexp.test(value) ? null : message);

/**
 * Проверка формата email, та же регулярка, что на бэкенде (VAL_EMAIL_REGEXP).
 * @type {Rule}
 */
export const email = pattern(/^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/, 'Некорректный email');

/**
 * Значение должно совпадать со значением другого поля формы.
 * @param {string} field - имя поля, с которым сравниваем
 * @param {string} message - текст ошибки
 * @returns {Rule}
 */
export const sameAs = (field, message) =>
  (value, values = {}) => (value === values[field] ? null : message);
