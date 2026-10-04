/**
 * Включает кнопки «показать пароль» внутри контейнера.
 *
 * @param {HTMLElement} root
 */
export function initPasswordToggles(root) {
  root.addEventListener('click', (e) => {
    const toggle = e.target.closest('[data-password-toggle]');
    if (!toggle) return;

    const input = root.querySelector(`#${toggle.dataset.passwordToggle}`);
    const isHidden = input.type === 'password';

    input.type = isHidden ? 'text' : 'password';
    toggle.classList.toggle('form-field__toggle--visible', isHidden);
    toggle.setAttribute('aria-label', isHidden ? 'Скрыть пароль' : 'Показать пароль');
  });
}
