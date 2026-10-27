import { logout } from '../../modules/api/auth.js';
import { ApiError } from '../../modules/api/request.js';
import { bindLinks } from '../../utils/helpers/bindLinks.js';
import { requireElement } from '../../utils/helpers/dom.js';
import { ROUTES } from '../../app/paths.js';
import type { Navigate } from '../../app/paths.js';
import type { ProfileMenu } from './profileMenu.types.js';

export function initProfileMenu(
  menu: HTMLElement,
  button: HTMLButtonElement,
  navigate: Navigate,
): ProfileMenu {
  const logoutButton = requireElement<HTMLButtonElement>(menu, '[data-logout]');
  const error = requireElement<HTMLElement>(menu, '.profile-menu__error');
  let pending = false;
  let destroyed = false;

  function close(restoreFocus = false): void {
    menu.hidden = true;
    button.setAttribute('aria-expanded', 'false');
    document.removeEventListener('click', handleOutsideClick);
    document.removeEventListener('keydown', handleKeydown);
    if (restoreFocus && button.isConnected) {
      button.focus();
    }
  }

  function open(): void {
    menu.hidden = false;
    button.setAttribute('aria-expanded', 'true');
    document.addEventListener('click', handleOutsideClick);
    document.addEventListener('keydown', handleKeydown);
    menu.querySelector<HTMLElement>('a[data-link]')?.focus();
  }

  function toggle(): void {
    if (menu.hidden) {
      open();
    } else {
      close();
    }
  }

  function handleOutsideClick(event: MouseEvent): void {
    if (!(event.target instanceof Node)) {
      return;
    }
    if (!menu.contains(event.target) && !button.contains(event.target)) {
      close();
    }
  }

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
