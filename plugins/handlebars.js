/**
 * @file Vite-плагин для прекомпиляции Handlebars-шаблонов.
 * Импорт файла .hbs превращается в JS-модуль с готовой функцией шаблона,
 * поэтому в браузер попадает только рантайм Handlebars, без компилятора.
 */

import Handlebars from 'handlebars';

/** Расширение файлов, которые обрабатывает плагин. */
const TEMPLATE_EXT = '.hbs';

/**
 * Создаёт плагин прекомпиляции Handlebars.
 * @returns {import('vite').Plugin} плагин для секции plugins в vite.config.js
 */
export default function handlebarsPrecompile() {
  return {
    name: 'handlebars-precompile',

    /**
     * Компилирует .hbs-файл в JS-модуль.
     * @param {string} code - исходный текст шаблона
     * @param {string} id - путь к файлу
     * @returns {{code: string, map: null} | null} JS-модуль или null, если файл не шаблон
     */
    transform(code, id) {
      if (!id.endsWith(TEMPLATE_EXT)) {
        return null;
      }

      const spec = Handlebars.precompile(code);

      return {
        code: `import Handlebars from 'handlebars/runtime';
export default Handlebars.template(${spec});`,
        map: null,
      };
    },
  };
}
