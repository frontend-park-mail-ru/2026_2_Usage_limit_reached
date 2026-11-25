import { Modal } from '@/components/modal/modal.ts';
import { setAlert } from '@/components/alert/alert.ts';
import { showToast } from '@/components/toast/toast.ts';
import { requireElement } from '@/utils/helpers/dom.ts';
import { createUuid } from '@/utils/helpers/uuid.ts';
import { formatMoney, toMinor } from '@/utils/helpers/money.ts';
import { validate } from '@/modules/validation/validate.ts';
import { donationSchema } from '@/modules/validation/schemas.ts';
import { setFieldError } from '@/modules/validation/bindForm.ts';
import { sendDonation } from '@/modules/api/donations.ts';
import { ApiError } from '@/modules/api/request.ts';
import type { PostAuthor } from '@/modules/api/posts.types.ts';
import { AVATAR_PLACEHOLDER } from '@/modules/profile/profile.constants.ts';
import { bindAvatarFallback } from '@/modules/profile/avatarFallback.ts';
import { getSessionContext } from '@/modules/auth/auth.actions.ts';
import type { SessionContext } from '@/modules/auth/auth.types.ts';
import {
  DEFAULT_AMOUNT,
  DONATE_ERROR,
  DONATE_ERROR_TITLE,
  DONATE_CONFLICT_TITLE,
  DONATE_ERROR_MESSAGES,
  DONATE_TITLES,
  PAYMENT_FAILED_ERROR,
  SENDING_LABEL,
  SENT_MESSAGE,
} from './donateDialog.constants.ts';
import type { DonateStep } from './donateDialog.types.ts';

/** Окно пожертвования: форма, подтверждение и успех. */
export class DonateDialog {
  private readonly dialog: HTMLDialogElement;
  private readonly modal: Modal;
  private readonly title: HTMLElement;
  private readonly form: HTMLFormElement;
  private readonly amountInput: HTMLInputElement;
  private readonly messageInput: HTMLTextAreaElement;
  private readonly error: HTMLElement;
  private readonly backButton: HTMLButtonElement;
  private readonly sendButton: HTMLButtonElement;
  private readonly onClick: (event: MouseEvent) => void;
  private readonly onInput: () => void;
  private readonly onSubmit: (event: SubmitEvent) => void;
  private readonly isSessionValid: () => boolean;
  private readonly unbindAvatarFallback: () => void;
  private author: PostAuthor | null = null;
  private requestKey: string | null = null;
  private sendLabel = '';
  private hasSubmitted = false;
  private isSending = false;
  private needsCheck = false;
  private context: SessionContext | undefined;
  private destroyed = false;

  /**
   * @param dialog
   * @param isSessionValid
   */
  constructor(dialog: HTMLDialogElement, isSessionValid: () => boolean = () => true) {
    this.dialog = dialog;
    this.unbindAvatarFallback = bindAvatarFallback(dialog);
    this.isSessionValid = isSessionValid;
    this.modal = new Modal(dialog, () => {}, () => !this.isSending);
    this.title = requireElement<HTMLElement>(dialog, '.modal__title');
    this.form = requireElement<HTMLFormElement>(dialog, '.donate-dialog__form');
    this.amountInput = requireElement<HTMLInputElement>(this.form, '[name="amount"]');
    this.messageInput = requireElement<HTMLTextAreaElement>(this.form, '[name="message"]');
    this.error = requireElement<HTMLElement>(dialog, '.donate-dialog__error');
    this.backButton = requireElement<HTMLButtonElement>(dialog, '[data-donate-back]');
    this.sendButton = requireElement<HTMLButtonElement>(dialog, '[data-donate-send]');
    this.onClick = this.handleClick.bind(this);
    this.onInput = this.handleInput.bind(this);
    this.onSubmit = this.handleSubmit.bind(this);
    dialog.addEventListener('click', this.onClick);
    this.form.addEventListener('input', this.onInput);
    this.form.addEventListener('submit', this.onSubmit);
  }

  /**
   * Открывает форму, сохраняя конфликтную попытку для того же автора и сессии.
   * @param author
   */
  open(author: PostAuthor): void {
    const context = getSessionContext();
    if (!context || this.isSending || this.destroyed) {
      return;
    }
    if (!this.needsCheck || this.author?.id !== author.id || this.context !== context) {
      this.needsCheck = false;
      this.requestKey = null;
      this.hasSubmitted = false;
      this.form.reset();
      this.amountInput.value = DEFAULT_AMOUNT;
    }
    this.context = context;
    this.author = author;
    setFieldError(this.form, 'amount', null);
    setFieldError(this.form, 'message', null);
    setAlert(this.error, this.needsCheck ? DONATE_ERROR_MESSAGES[409] : null,
      this.needsCheck ? DONATE_CONFLICT_TITLE : DONATE_ERROR_TITLE);
    this.setSending(false);
    this.fillAuthor(author);
    this.updatePresets();
    this.modal.open();
    this.showStep('form');
  }

  /** Снимает обработчики. */
  destroy(): void {
    this.destroyed = true;
    this.unbindAvatarFallback();
    this.dialog.removeEventListener('click', this.onClick);
    this.form.removeEventListener('input', this.onInput);
    this.form.removeEventListener('submit', this.onSubmit);
    this.modal.destroy();
  }

  /** Значения формы без пробелов по краям. */
  private values() {
    return { amount: this.amountInput.value.trim(), message: this.messageInput.value.trim() };
  }

  /**
   * Подставляет аватар и имена автора во все шаги.
   * @param author
   */
  private fillAuthor(author: PostAuthor): void {
    this.dialog.querySelectorAll<HTMLImageElement>('[data-donate-avatar]').forEach((avatar) => {
      avatar.src = author.avatar_url || AVATAR_PLACEHOLDER;
    });
    this.dialog.querySelectorAll('[data-donate-name]').forEach((name) => {
      name.textContent = author.nickname;
    });
    this.dialog.querySelectorAll('[data-donate-username]').forEach((username) => {
      username.textContent = `@${author.username}`;
    });
  }

  /**
   * Показывает один шаг и ставит на него фокус.
   * @param step
   */
  private showStep(step: DonateStep): void {
    this.dialog.querySelectorAll<HTMLElement>('[data-donate-step]').forEach((element) => {
      element.hidden = element.dataset.donateStep !== step;
    });
    this.title.textContent = DONATE_TITLES[step];
    const focus = this.needsCheck ? '[data-donate-check]' : `[data-donate-step="${step}"] [data-donate-focus]`;
    requireElement<HTMLElement>(this.dialog, focus).focus();
  }

  /** Подсвечивает кнопку суммы, равной введённой. */
  private updatePresets(): void {
    this.dialog.querySelectorAll<HTMLButtonElement>('[data-amount]').forEach((button) => {
      button.setAttribute('aria-pressed', String(button.dataset.amount === this.amountInput.value.trim()));
    });
  }

  /**
   * Показывает ошибки полей и возвращает, верна ли форма.
   */
  private checkForm(): boolean {
    const { isValid, errors } = validate(this.values(), donationSchema);
    for (const name of Object.keys(donationSchema)) {
      setFieldError(this.form, name, errors[name] ?? null);
    }
    return isValid;
  }

  /**
   * Обрабатывает кнопки сумм, «Назад» и «Отправить».
   * @param event
   */
  private handleClick(event: MouseEvent): void {
    if (!(event.target instanceof Element) || this.needsCheck || this.isSending) {
      return;
    }
    const preset = event.target.closest<HTMLButtonElement>('[data-amount]');
    if (preset) {
      this.amountInput.value = preset.dataset.amount ?? '';
      this.handleInput();
    } else if (event.target.closest('[data-donate-back]')) {
      this.showStep('form');
    } else if (event.target.closest('[data-donate-send]')) {
      void this.send();
    }
  }

  /** Новый ключ и свежие ошибки после правки формы */
  private handleInput(): void {
    if (this.needsCheck || this.isSending) {
      return;
    }
    this.requestKey = null;
    this.updatePresets();
    if (this.hasSubmitted) {
      this.checkForm();
    }
  }

  /**
   * Проверяет форму и переходит к подтверждению.
   * @param event
   */
  private handleSubmit(event: SubmitEvent): void {
    event.preventDefault();
    if (this.needsCheck || this.isSending) {
      return;
    }
    this.hasSubmitted = true;
    if (!this.checkForm()) {
      this.form.querySelector<HTMLElement>('[aria-invalid="true"]')?.focus();
      return;
    }
    const { amount, message } = this.values();
    const label = formatMoney(toMinor(Number(amount)));
    requireElement<HTMLElement>(this.dialog, '[data-donate-amount]').textContent = label;
    requireElement<HTMLElement>(this.dialog, '[data-donate-message]').textContent = message;
    requireElement<HTMLElement>(this.dialog, '[data-donate-message-box]').hidden = !message;
    this.sendLabel = `Отправить ${label}`;
    this.setSending(this.isSending);
    setAlert(this.error, null);
    this.showStep('confirm');
  }

  /**
   * Блокирует кнопки на время запроса.
   * @param isSending
   */
  private setSending(isSending: boolean): void {
    this.isSending = isSending;
    this.sendButton.disabled = isSending || this.needsCheck;
    this.backButton.disabled = isSending;
    this.sendButton.textContent = isSending ? SENDING_LABEL : this.sendLabel;
    this.form.querySelectorAll<HTMLInputElement | HTMLTextAreaElement | HTMLButtonElement>('input, textarea, button')
      .forEach((element) => { element.disabled = isSending || this.needsCheck; });
    requireElement<HTMLElement>(this.form, '[data-donate-continue]').hidden = this.needsCheck;
    requireElement<HTMLElement>(this.form, '[data-donate-check]').hidden = !this.needsCheck;
    this.dialog.querySelectorAll<HTMLButtonElement>('[data-modal-close]')
      .forEach((button) => { button.disabled = isSending; });
  }

  /** Отправляет пожертвование и показывает итог. */
  private async send(): Promise<void> {
    const context = this.context;
    if (!this.author || !context || context !== getSessionContext() || this.isSending
      || this.needsCheck || this.destroyed || !this.isSessionValid()) {
      return;
    }
    const { amount, message } = this.values();
    const amountMinor = toMinor(Number(amount));
    const requestKey = this.requestKey ?? createUuid();
    this.requestKey = requestKey;
    this.setSending(true);
    try {
      const result = await sendDonation(this.author.id, {
        request_key: requestKey,
        amount_minor: amountMinor,
        currency: 'RUB',
        message: message || null,
        is_anonymous: false,
      });
      if (this.destroyed || context !== getSessionContext() || !this.isSessionValid()) {
        return;
      }
      if (!this.dialog.open || this.requestKey !== requestKey) {
        if (result.status === 'paid') {
          showToast(SENT_MESSAGE);
        }
        return;
      }
      if (result.status === 'paid') {
        this.showSuccess(this.author, amountMinor, !!message);
      } else if (result.status === 'failed' || result.status === 'canceled') {
        this.requestKey = null;
        this.showError(PAYMENT_FAILED_ERROR);
      } else {
        this.needsCheck = true;
        this.setSending(false);
        this.showError(DONATE_ERROR_MESSAGES[409]);
      }
    } catch (err) {
      if (this.destroyed || context !== getSessionContext() || !this.isSessionValid()) {
        return;
      }
      if (!(err instanceof ApiError)) {
        throw err;
      }
      if (!this.dialog.open || this.requestKey !== requestKey) {
        return;
      }
      if (!err.isCsrfError && err.status === 409) {
        this.needsCheck = true;
        this.setSending(false);
      }
      this.showError(err.isCsrfError || err.isMutationTimeout ? err.text : DONATE_ERROR_MESSAGES[err.status] ?? DONATE_ERROR);
    } finally {
      this.setSending(false);
    }
  }

  /**
   * Возвращает к форме с плашкой ошибки.
   * @param text
   */
  private showError(text: string): void {
    setAlert(this.error, text, this.needsCheck ? DONATE_CONFLICT_TITLE : DONATE_ERROR_TITLE);
    this.showStep('form');
  }

  /**
   * Показывает шаг благодарности.
   * @param author
   * @param amountMinor
   * @param hasMessage
   */
  private showSuccess(author: PostAuthor, amountMinor: number, hasMessage: boolean): void {
    requireElement<HTMLElement>(this.dialog, '[data-donate-summary]').textContent = `${author.nickname} · ${formatMoney(amountMinor)}`;
    requireElement<HTMLElement>(this.dialog, '[data-donate-success-note]').hidden = !hasMessage;
    this.showStep('success');
  }
}
