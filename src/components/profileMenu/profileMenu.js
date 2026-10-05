import { logout } from '../../modules/api/auth.js';
import { ApiError } from '../../modules/api/request.js';
import { bindLinks } from '../../utils/helpers/bindLinks.js';

/**
 * Подключает меню профиля и выход из аккаунта.
 * @param {HTMLElement} menu - Панель меню.
 * @param {HTMLButtonElement} button - Кнопка открытия.
 * @param {(path: string) => void} navigate - Функция перехода.
 * @returns {{close: Function, destroy: Function}} Управление меню.
 */
export function initProfileMenu(menu, button, navigate) {
  const logoutButton = menu.querySelector('[data-logout]');
  const error = menu.querySelector('.profile-menu__error');
  let pending = false;
  let destroyed = false;

  /**
   * Закрывает меню и снимает временные слушатели.
   * @param {boolean} [restoreFocus=false] - Вернуть фокус на кнопку.
   * @returns {void}
   */
  function close(restoreFocus = false) {
    menu.hidden = true;
    button.setAttribute('aria-expanded', 'false');
    document.removeEventListener('click', handleOutsideClick);
    document.removeEventListener('keydown', handleKeydown);
    if (restoreFocus && button.isConnected) button.focus();
  }

  /**
   * Открывает меню и переводит фокус на первый пункт.
   * @returns {void}
   */
  function open() {
    menu.hidden = false;
    button.setAttribute('aria-expanded', 'true');
    document.addEventListener('click', handleOutsideClick);
    document.addEventListener('keydown', handleKeydown);
    menu.querySelector('a[data-link]').focus();
  }

  /**
   * Переключает видимость меню.
   * @returns {void}
   */
  function toggle() {
    if (menu.hidden) open();
    else close();
  }

  /**
   * Закрывает меню при клике снаружи.
   * @param {MouseEvent} event - Событие клика.
   * @returns {void}
   */
  function handleOutsideClick(event) {
    if (!menu.contains(event.target) && !button.contains(event.target)) close();
  }

  /**
   * Обрабатывает Escape и переходы по пунктам меню.
   * @param {KeyboardEvent} event - Событие клавиатуры.
   * @returns {void}
   */
  function handleKeydown(event) {
    if (event.key === 'Escape') {
      event.preventDefault();
      close(true);
      return;
    }
    if (!menu.contains(document.activeElement)) return;
    if (!['ArrowDown', 'ArrowUp', 'Home', 'End'].includes(event.key)) return;
    event.preventDefault();
    const items = [...menu.querySelectorAll('[role="menuitem"]')].filter((item) => !item.disabled);
    const current = items.indexOf(document.activeElement);
    let next = event.key === 'ArrowUp' ? current - 1 : current + 1;
    if (event.key === 'Home') next = 0;
    if (event.key === 'End') next = items.length - 1;
    items[(next + items.length) % items.length].focus();
  }

  /**
   * Завершает сессию или показывает ошибку выхода.
   * @returns {Promise<void>}
   */
  async function handleLogout() {
    if (pending) return;
    pending = true;
    logoutButton.disabled = true;
    error.hidden = true;
    error.textContent = '';
    close();
    try {
      await logout();
      if (!destroyed) navigate('/login');
    } catch (err) {
      if (destroyed) return;
      if (err instanceof ApiError && err.status === 401) {
        navigate('/login');
        return;
      }
      error.textContent = err instanceof ApiError && err.status === 0
        ? 'Сервер недоступен. Проверьте интернет и попробуйте ещё раз'
        : 'Не удалось выйти. Попробуйте позже';
      error.hidden = false;
      open();
    } finally {
      pending = false;
      logoutButton.disabled = false;
    }
  }

  /**
   * Снимает обработчики перед удалением сайдбара.
   * @returns {void}
   */
  function destroy() {
    destroyed = true;
    close();
    button.removeEventListener('click', toggle);
    logoutButton.removeEventListener('click', handleLogout);
  }

  bindLinks(menu, (path) => {
    close();
    navigate(path);
  });
  button.addEventListener('click', toggle);
  logoutButton.addEventListener('click', handleLogout);
  return { close, destroy };
}
