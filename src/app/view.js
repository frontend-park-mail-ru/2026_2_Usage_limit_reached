const COMPONENTS_PREFIX = 'components/';

/**
 * Регистрирует шаблоны всех компонентов как partials.
 * Имя partial совпадает с именем файла: components/logo/logo → {{> logo}}.
 */
function registerPartials() {
  for (const [name, template] of Object.entries(Handlebars.templates)) {
    if (name.startsWith(COMPONENTS_PREFIX)) {
      Handlebars.registerPartial(name.split('/').pop(), template);
    }
  }
}

registerPartials();

/**
 * Находит шаблон по имени и подставляет в него данные.
 * @param {string} name
 * @param {Object} [data={}]
 * @returns {string}
 * @throws {Error}
 */
export function render(name, data = {}) {
  const template = Handlebars.templates[name];
  if (!template) {
    throw new Error(`Шаблон ${name} не найден`);
  }
  return template(data);
}
