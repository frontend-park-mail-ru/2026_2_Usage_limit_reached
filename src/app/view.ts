import { COMPONENTS_PREFIX } from './view.constants.ts';

function registerPartials(): void {
  for (const [name, template] of Object.entries(Handlebars.templates)) {
    if (name.startsWith(COMPONENTS_PREFIX)) {
      Handlebars.registerPartial(name.slice(name.lastIndexOf('/') + 1), template);
    }
  }
}

registerPartials();

/**
 * @param name
 * @param data
 * @throws {Error}
 */
export function render(name: string, data: object = {}): string {
  const template = Handlebars.templates[name];
  if (!template) {
    throw new Error(`Шаблон ${name} не найден`);
  }
  return template(data);
}
