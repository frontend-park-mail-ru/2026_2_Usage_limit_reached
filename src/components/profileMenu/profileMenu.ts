import { logout } from '../../modules/api/auth.ts';
import { ApiError } from '../../modules/api/request.ts';
import { bindLinks } from '../../utils/helpers/bindLinks.ts';
import { requireElement } from '../../utils/helpers/dom.ts';
import { ROUTES } from '../../app/paths.ts';
import type { Navigate } from '../../app/paths.ts';

/** Управляет меню профиля и выходом из аккаунта. */
export class ProfileMenu {
  private readonly menuElement: HTMLElement;
  private readonly buttonElement: HTMLButtonElement;
  private readonly logoutButton: HTMLButtonElement;
  private readonly errorElement: HTMLElement;
  private readonly onToggle: () => void;
  private readonly onOutsideClick: (event: MouseEvent) => void;
  private readonly onKeydown: (event: KeyboardEvent) => void;
  private readonly onLogout: () => Promise<void>;
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
    menuSelector = '#sidebar .profile-menu',
    buttonSelector = '#sidebar .sidebar__item--profile',
  ) {
    this.menuElement = requireElement<HTMLElement>(document, menuSelector);
    this.buttonElement = requireElement<HTMLButtonElement>(document, buttonSelector);
    this.logoutButton = requireElement<HTMLButtonElement>(this.menu, '[data-logout]');
    this.errorElement = requireElement<HTMLElement>(this.menu, '.profile-menu__error');

    this.onToggle = this.toggle.bind(this);
    this.onOutsideClick = this.handleOutsideClick.bind(this);
    this.onKeydown = this.handleKeydown.bind(this);
    this.onLogout = this.handleLogout.bind(this, navigate);

    bindLinks(this.menu, (path) => {
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
    this.menu.querySelector<HTMLElement>('a[data-link]')?.focus();
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

  /** Блокирует повторный выход и убирает предыдущую ошибку. */
  private resetState(): void {
    this.pending = true;
    this.logoutButton.disabled = true;
    this.errorElement.hidden = true;
    this.errorElement.textContent = '';
  }

  /**
   * Завершает сессию или показывает ошибку выхода.
   * @param navigate
   */
  private async handleLogout(navigate: Navigate): Promise<void> {
    if (this.pending || this.destroyed) {
      return;
    }
    this.resetState();
    this.close();
    try {
      await logout();
      if (!this.destroyed) {
        navigate(ROUTES.login);
      }
    } catch (err) {
      if (this.destroyed) {
        return;
      }
      if (err instanceof ApiError && err.status === 401) {
        navigate(ROUTES.login);
        return;
      }
      if (err instanceof ApiError) {
        this.errorElement.textContent = err.text;
      } else {
        this.errorElement.textContent = 'Не удалось выйти. Попробуйте позже';
      }
      this.errorElement.hidden = false;
      this.open();
    } finally {
      this.pending = false;
      this.logoutButton.disabled = false;
    }
  }

  /** Снимает обработчики перед удалением сайдбара. */
  destroy(): void {
    this.destroyed = true;
    this.close();
    this.button.removeEventListener('click', this.onToggle);
    this.logoutButton.removeEventListener('click', this.onLogout);
  }
}
