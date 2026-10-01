import Handlebars from 'handlebars';
import formFieldTemplate from '../components/formField/formField.hbs?raw';
import logoTemplate from '../components/logo/logo.hbs?raw';

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
