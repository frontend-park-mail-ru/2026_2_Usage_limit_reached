/**
 * Определяет, можно ли заменить обычный переход ссылки навигацией SPA.
 * Модификаторы, target и download сохраняют поведение браузера.
 * @param {MouseEvent} event - Клик обработчика, установленного на ссылку.
 * @returns {boolean} true для обычного клика по внутренней ссылке.
 */
export function shouldHandleLinkClick(event) {
  const link = event.currentTarget;
  return link instanceof HTMLAnchorElement
    && !event.defaultPrevented
    && event.button === 0
    && !event.ctrlKey
    && !event.metaKey
    && !event.shiftKey
    && !event.altKey
    && !link.hasAttribute('target')
    && !link.hasAttribute('download')
    && link.origin === window.location.origin;
}

/**
 * Подключает переходы к внутренним ссылкам контейнера после его рендера.
 * Вызывается один раз для каждого нового экземпляра разметки.
 * @param {HTMLElement} container - Контейнер со ссылками a[data-link].
 * @param {(path: string) => void} navigate - Функция перехода из роутера.
 * @returns {void}
 */
export function bindLinks(container, navigate) {
  container.querySelectorAll('a[data-link]').forEach((link) => {
    link.addEventListener('click', (event) => {
      if (!shouldHandleLinkClick(event)) return;
      event.preventDefault();
      navigate(link.getAttribute('href'));
    });
  });
}
