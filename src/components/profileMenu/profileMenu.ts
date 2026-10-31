import { logout } from '../../modules/api/auth.ts';
import { ApiError } from '../../modules/api/request.ts';
import { bindLinks } from '../../utils/helpers/bindLinks.ts';
import { requireElement } from '../../utils/helpers/dom.ts';
import { ROUTES } from '../../app/paths.ts';
import type { Navigate } from '../../app/paths.ts';
import type { ProfileMenu } from './profileMenu.types.ts';

/**
 * Подключает меню профиля и выход из аккаунта.
 * @param menu
 * @param button
 * @param navigate
 */
export function initProfileMenu(
  menu: HTMLElement,
  button: HTMLButtonElement,
  navigate: Navigate,
): ProfileMenu {
  const logoutButton = requireElement<HTMLButtonElement>(menu, '[data-logout]');
  const error = requireElement<HTMLElement>(menu, '.profile-menu__error');
  let pending = false;
  let destroyed = false;

  /**
   * Закрывает меню и снимает временные обработчики.
   * @param restoreFocus
   */
  function close(restoreFocus = false): void {
    menu.hidden = true;
    button.setAttribute('aria-expanded', 'false');
    document.removeEventListener('click', handleOutsideClick);
    document.removeEventListener('keydown', handleKeydown);
    if (restoreFocus && button.isConnected) {
      button.focus();
    }
  }

  /** Открывает меню и переводит фокус на первый пункт. */
  function open(): void {
    menu.hidden = false;
    button.setAttribute('aria-expanded', 'true');
    document.addEventListener('click', handleOutsideClick);
    document.addEventListener('keydown', handleKeydown);
    menu.querySelector<HTMLElement>('a[data-link]')?.focus();
  }

  /** Переключает видимость меню. */
  function toggle(): void {
    if (menu.hidden) {
      open();
    } else {
      close();
    }
  }

  /**
   * Закрывает меню при клике снаружи.
   * @param event
   */
  function handleOutsideClick(event: MouseEvent): void {
    if (!(event.target instanceof Node)) {
      return;
    }
    if (!menu.contains(event.target) && !button.contains(event.target)) {
      close();
    }
  }

  /**
   * Обрабатывает Escape и переходы по пунктам меню.
   * @param event
   */
  function handleKeydown(event: KeyboardEvent): void {
    if (event.key === 'Escape') {
      event.preventDefault();
      close(true);
      return;
    }
    if (!menu.contains(document.activeElement)) {
      return;
    }
    if (!['ArrowDown', 'ArrowUp', 'Home', 'End'].includes(event.key)) {
      return;
    }
    event.preventDefault();
    const items = [...menu.querySelectorAll<HTMLElement>('[role="menuitem"]')]
      .filter((item) => !(item instanceof HTMLButtonElement && item.disabled));
    const current = items.findIndex((item) => item === document.activeElement);
    let next = event.key === 'ArrowUp' ? current - 1 : current + 1;
    if (event.key === 'Home') {
      next = 0;
    }
    if (event.key === 'End') {
      next = items.length - 1;
    }
    items[(next + items.length) % items.length].focus();
  }

  /** Завершает сессию или показывает ошибку выхода. */
  async function handleLogout(): Promise<void> {
    if (pending) {
      return;
    }
    pending = true;
    logoutButton.disabled = true;
    error.hidden = true;
    error.textContent = '';
    close();
    try {
      await logout();
      if (!destroyed) {
        navigate(ROUTES.login);
      }
    } catch (err) {
      if (destroyed) {
        return;
      }
      if (err instanceof ApiError && err.status === 401) {
        navigate(ROUTES.login);
        return;
      }
      if (err instanceof ApiError) {
        error.textContent = err.text;
      } else {
        error.textContent = 'Не удалось выйти. Попробуйте позже';
      }
      error.hidden = false;
      open();
    } finally {
      pending = false;
      logoutButton.disabled = false;
    }
  }

  /** Снимает обработчики перед удалением сайдбара. */
  function destroy(): void {
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
