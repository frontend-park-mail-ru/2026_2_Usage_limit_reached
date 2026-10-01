import Handlebars from 'handlebars';

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
