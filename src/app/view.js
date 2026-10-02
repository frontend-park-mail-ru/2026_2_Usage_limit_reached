/**
 * @file Обёртка над Handlebars: регистрирует компоненты как partials
 * и превращает шаблон с данными в HTML.
 * Шаблоны прекомпилирует утилита handlebars (npm run precompile)
 * в файл templates.js, он подключён в index.html и кладёт их в Handlebars.templates.
 */

/** Папка компонентов: шаблоны из неё регистрируются как partials. */
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
 * @param {string} name - Путь к шаблону от src без расширения, например 'pages/login/login'.
 * @param {Object} [data={}] - Данные для подстановки.
 * @returns {string} Готовый HTML.
 * @throws {Error} Если шаблона нет: забыли запустить npm run precompile или опечатались в имени.
 */
export function render(name, data = {}) {
  const template = Handlebars.templates[name];
  if (!template) {
    throw new Error(`Шаблон ${name} не найден`);
  }
  return template(data);
}
