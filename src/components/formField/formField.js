/**
 * Шаблон поля формы
 * @type {string}
 */
export const formFieldTemplate = `
  <div class="form-field">
    <label class="form-field__label" for="{{id}}">{{label}}</label>
    <div class="form-field__control">
      <input
        class="form-field__input"
        id="{{id}}"
        name="{{name}}"
        type="{{type}}"
        autocomplete="{{autocomplete}}"
        placeholder="{{placeholder}}"
        aria-describedby="{{id}}-error"
      />
      {{#if passwordToggle}}
        <button class="form-field__toggle" type="button" data-password-toggle="{{id}}" aria-label="Показать пароль">
          <svg class="form-field__icon form-field__icon--hidden" width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
            <path d="M14.95 14.9499C13.5255 16.0358 11.791 16.6373 10 16.6666C4.16671 16.6666 0.833374 9.99992 0.833374 9.99992C1.86995 8.06817 3.30765 6.38043 5.05004 5.04992M8.25004 3.53325C8.82365 3.39898 9.41093 3.33187 10 3.33325C15.8334 3.33325 19.1667 9.99992 19.1667 9.99992C18.6609 10.9463 18.0576 11.8372 17.3667 12.6583M11.7667 11.7666C11.5378 12.0122 11.2618 12.2092 10.9552 12.3459C10.6485 12.4825 10.3175 12.556 9.98178 12.5619C9.64611 12.5678 9.31268 12.5061 9.00138 12.3803C8.69009 12.2546 8.40731 12.0674 8.16991 11.83C7.93252 11.5927 7.74537 11.3099 7.61963 10.9986C7.4939 10.6873 7.43215 10.3539 7.43807 10.0182C7.44399 9.6825 7.51746 9.35146 7.6541 9.04479C7.79074 8.73813 7.98775 8.46213 8.23337 8.23325M0.833374 0.833252L19.1667 19.1666" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
          <svg class="form-field__icon form-field__icon--visible" width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
            <path d="M0.83 10C0.83 10 4.17 3.33 10 3.33C15.83 3.33 19.17 10 19.17 10C19.17 10 15.83 16.67 10 16.67C4.17 16.67 0.83 10 0.83 10Z" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>
            <circle cx="10" cy="10" r="2.5" stroke="currentColor" stroke-width="2.5"/>
          </svg>
        </button>
      {{/if}}
    </div>
    <p class="form-field__error" id="{{id}}-error" data-error-for="{{name}}" aria-live="polite"></p>
  </div>
`;

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
