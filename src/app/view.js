import Handlebars from 'handlebars/runtime';

/**
 * Готовый шаблон: плагин handlebars-precompile превращает файл .hbs в такую функцию.
 * @typedef {(data: Object) => string} Template
 */

/**
 * Регистрирует шаблоны всех компонентов как partials.
 * Имя partial совпадает с именем файла: components/logo/logo.hbs → {{> logo}}.
 */
function registerPartials() {
  /** @type {Object<string, Template>} */
  const templates = import.meta.glob('../components/**/*.hbs', {
    eager: true,
    import: 'default',
  });

  for (const [path, template] of Object.entries(templates)) {
    const name = path.split('/').pop().replace('.hbs', '');
    Handlebars.registerPartial(name, template);
  }
}

registerPartials();

/**
 * Подставляет данные в шаблон.
 * @param {Template} template - Шаблон, импортированный из файла .hbs.
 * @param {Object} [data={}] - Данные для подстановки.
 * @returns {string} Готовый HTML.
 */
export function render(template, data = {}) {
  return template(data);
}
