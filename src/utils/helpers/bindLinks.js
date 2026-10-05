/**
 * Подключает переходы по ссылкам контейнера.
 * @param {HTMLElement} container - Контейнер ссылок.
 * @param {(path: string) => void} navigate - Функция перехода.
 * @returns {void}
 */
export function bindLinks(container, navigate) {
  container.querySelectorAll('a[data-link]').forEach((link) => {
    link.addEventListener('click', (event) => {
      event.preventDefault();
      navigate(link.getAttribute('href'));
    });
  });
}
