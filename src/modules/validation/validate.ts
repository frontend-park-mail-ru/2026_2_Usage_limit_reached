import type { FormValues, Schema, ValidationResult } from './validation.types.js';

export const validateField = (field: string, values: FormValues, schema: Schema): string | null => {
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

export const validate = (values: FormValues, schema: Schema): ValidationResult => {
  const errors: Record<string, string> = {};

  for (const field of Object.keys(schema)) {
    const error = validateField(field, values, schema);
    if (error) {
      errors[field] = error;
    }
  }

  return { isValid: Object.keys(errors).length === 0, errors };
};
