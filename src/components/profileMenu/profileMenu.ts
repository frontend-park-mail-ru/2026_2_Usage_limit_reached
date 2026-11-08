import { getSessionVersion, logout } from '@/modules/auth/auth.actions.ts';
import { authStore } from '@/modules/auth/auth.store.ts';
import { ApiError } from '@/modules/api/request.ts';
import { ConfirmDialog } from '@/components/confirmDialog/confirmDialog.ts';
import { bindLinks } from '@/utils/helpers/bindLinks.ts';
import { requireElement } from '@/utils/helpers/dom.ts';
import type { Navigate } from '@/app/paths.ts';

/** Управляет меню профиля и выходом из аккаунта. */
export class ProfileMenu {
  private readonly menuElement: HTMLElement;
  private readonly buttonElement: HTMLButtonElement;
  private readonly logoutButton: HTMLButtonElement;
  private readonly logoutDialog: ConfirmDialog;
  private readonly onToggle: () => void;
  private readonly onOutsideClick: (event: MouseEvent) => void;
  private readonly onKeydown: (event: KeyboardEvent) => void;
  private readonly onLogout: () => void;
  private readonly unbindLinks: () => void;
  private pending = false;
  private destroyed = false;

  /**
   * Подключает обработчики меню по указанным селекторам.
   * @param navigate
   * @param menuSelector
   * @param buttonSelector
   */
  constructor(
    navigate: Navigate,
    menuSelector = '.profile-menu',
    buttonSelector = '.sidebar__item-profile',
  ) {
    this.menuElement = requireElement<HTMLElement>(document, menuSelector);
    this.buttonElement = requireElement<HTMLButtonElement>(document, buttonSelector);
    this.logoutButton = requireElement<HTMLButtonElement>(this.menu, '[data-logout]');
    this.logoutDialog = new ConfirmDialog(requireElement(document, 'dialog[aria-labelledby="logout-confirm-title"]'), true);

    this.onToggle = this.toggle.bind(this);
    this.onOutsideClick = this.handleOutsideClick.bind(this);
    this.onKeydown = this.handleKeydown.bind(this);
    this.onLogout = this.confirmLogout.bind(this);

    this.unbindLinks = bindLinks(this.menu, (path) => {
      this.close();
      navigate(path);
    });
    this.button.addEventListener('click', this.onToggle);
    this.logoutButton.addEventListener('click', this.onLogout);
  }

  get button(): HTMLButtonElement {
    return this.buttonElement;
  }

  get menu(): HTMLElement {
    return this.menuElement;
  }

  /**
   * Закрывает меню и снимает временные обработчики.
   * @param restoreFocus
   */
  close(restoreFocus = false): void {
    this.menu.hidden = true;
    this.button.setAttribute('aria-expanded', 'false');
    document.removeEventListener('click', this.onOutsideClick);
    document.removeEventListener('keydown', this.onKeydown);
    if (restoreFocus && this.button.isConnected) {
      this.button.focus();
    }
  }

  /** Открывает меню и переводит фокус на первый пункт. */
  private open(): void {
    if (this.destroyed) {
      return;
    }
    this.menu.hidden = false;
    this.button.setAttribute('aria-expanded', 'true');
    document.addEventListener('click', this.onOutsideClick);
    document.addEventListener('keydown', this.onKeydown);
    this.menu.querySelector<HTMLElement>('[role="menuitem"]:not([hidden])')?.focus();
  }

  /** Переключает видимость меню. */
  private toggle(): void {
    if (this.menu.hidden) {
      this.open();
    } else {
      this.close();
    }
  }

  /**
   * Закрывает меню при клике снаружи.
   * @param event
   */
  private handleOutsideClick(event: MouseEvent): void {
    if (!(event.target instanceof Node)) {
      return;
    }
    if (!this.menu.contains(event.target) && !this.button.contains(event.target)) {
      this.close();
    }
  }

  /**
   * Обрабатывает Escape и переходы по пунктам меню.
   * @param event
   */
  private handleKeydown(event: KeyboardEvent): void {
    if (event.key === 'Escape') {
      event.preventDefault();
      this.close(true);
      return;
    }
    if (!this.menu.contains(document.activeElement)) {
      return;
    }
    if (!['ArrowDown', 'ArrowUp', 'Home', 'End'].includes(event.key)) {
      return;
    }
    event.preventDefault();
    const items = [...this.menu.querySelectorAll<HTMLElement>('[role="menuitem"]')]
      .filter((item) => !item.hidden && !(item instanceof HTMLButtonElement && item.disabled));
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

  /** Закрывает подтверждение при смене страницы. */
  closeLogoutConfirmation(): void {
    this.logoutDialog.close();
  }

  /** Запрашивает подтверждение для текущей сессии. */
  private confirmLogout(): void {
    if (this.pending || this.destroyed || authStore.getState().status !== 'authenticated') {
      return;
    }
    let version = getSessionVersion();
    this.close(true);
    this.logoutDialog.open(null, () => {
      if (version !== getSessionVersion()) {
        return Promise.resolve(null);
      }
      const result = this.handleLogout();
      version = getSessionVersion();
      return result;
    });
  }

  /**
   * Завершает сессию или показывает ошибку выхода.
   */
  private async handleLogout(): Promise<string | null> {
    if (this.pending || this.destroyed || authStore.getState().status !== 'authenticated') {
      return null;
    }
    this.pending = true;
    this.logoutButton.disabled = true;
    const request = logout();
    const version = getSessionVersion();
    try {
      await request;
      return null;
    } catch (err) {
      if (this.destroyed || version !== getSessionVersion() || (err instanceof ApiError && err.isUnauthorized)) {
        return null;
      }
      return err instanceof ApiError ? err.text : 'Не удалось выйти. Попробуйте позже';
    } finally {
      this.pending = false;
      this.logoutButton.disabled = false;
    }
  }

  /** Снимает обработчики перед удалением сайдбара. */
  destroy(): void {
    this.destroyed = true;
    this.close();
    this.logoutDialog.destroy();
    this.unbindLinks();
    this.button.removeEventListener('click', this.onToggle);
    this.logoutButton.removeEventListener('click', this.onLogout);
  }
}
