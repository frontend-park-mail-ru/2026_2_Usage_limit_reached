export type FormValues = Record<string, string>;

export type Rule = (value: string, values?: FormValues) => string | null;

export type Schema = Record<string, Rule[]>;

export type ValidationResult = {
  isValid: boolean;
  errors: Record<string, string>;
};
