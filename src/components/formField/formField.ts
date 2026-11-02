/**
 * Включает кнопки "показать пароль" внутри контейнера.
 * @param root
 */
export function initPasswordToggles(root: HTMLElement): void {
  root.addEventListener('click', (e) => {
    if (!(e.target instanceof Element)) {
      return;
    }
    const toggle = e.target.closest<HTMLElement>('[data-password-toggle]');
    if (!toggle) {
      return;
    }

    const input = root.querySelector<HTMLInputElement>(`#${toggle.dataset.passwordToggle}`);
    if (!input) {
      return;
    }
    const isHidden = input.type === 'password';

    input.type = isHidden ? 'text' : 'password';
    toggle.classList.toggle('form-field__toggle_visible', isHidden);
    toggle.setAttribute('aria-label', isHidden ? 'Скрыть пароль' : 'Показать пароль');
  });
}
