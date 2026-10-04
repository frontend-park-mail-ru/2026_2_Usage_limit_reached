/**
 * Результат валидации формы.
 * @typedef {Object} ValidationResult
 * @property {boolean} isValid
 * @property {Object<string, string>} errors
 */

/**
 * Проверяет одно поле и возвращает первую найденную ошибку.
 * @param {string} field
 * @param {Object<string, string>} values
 * @param {Schema} schema
 * @returns {string|null}
 */
export const validateField = (field, values, schema) => {
  const rules = schema[field] ?? [];
  const value = values[field] ?? '';

  for (const rule of rules) {
    const error = rule(value, values);
    if (error) {
      return error;
    }
  }

  return null;
};

/**
 * Проверяет все поля формы по схеме.
 * @param {Object<string, string>} values
 * @param {Schema} schema
 * @returns {ValidationResult}
 */
export const validate = (values, schema) => {
  const errors = {};

  for (const field of Object.keys(schema)) {
    const error = validateField(field, values, schema);
    if (error) {
      errors[field] = error;
    }
  }

  return { isValid: Object.keys(errors).length === 0, errors };
};
