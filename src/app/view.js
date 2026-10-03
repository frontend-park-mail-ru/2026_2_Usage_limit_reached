import { formFieldTemplate } from '../components/formField/formField.js';
import { logoTemplate } from '../components/logo/logo.js';

const Handlebars = window.Handlebars;

Handlebars.registerPartial('formField', formFieldTemplate);
Handlebars.registerPartial('logo', logoTemplate);

/**
 * Компилирует Handlebars-шаблон и подставляет данные.
 *
 * @param {string} templateStr - Строка шаблона.
 * @param {Object} [data={}] - Данные для подстановки.
 *
 * @returns {string} Готовый HTML.
 */
export function render(templateStr, data = {}) {
  const template = Handlebars.compile(templateStr);
  return template(data);
}
