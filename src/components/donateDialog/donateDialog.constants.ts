import type { DonateStep } from './donateDialog.types.ts';

export const DEFAULT_AMOUNT = '500';

export const DONATE_TITLES: Record<DonateStep, string> = {
  form: 'Пожертвовать',
  confirm: 'Проверьте пожертвование',
  success: 'Спасибо за пожертвование',
};

export const SENDING_LABEL = 'Отправляем…';
export const SENT_MESSAGE = 'Пожертвование отправлено';

export const PAYMENT_FAILED_ERROR = 'Платёж не прошёл. Сумма и сообщение остались в форме. Попробуйте ещё раз';
export const DONATE_ERROR = 'Сумма и сообщение остались в форме. Попробуйте позже';

export const DONATE_ERROR_MESSAGES: Record<number, string> = {
  0: 'Сумма и сообщение остались в форме. Проверьте интернет и попробуйте ещё раз',
  400: 'Проверьте сумму и сообщение',
  401: 'Войдите в аккаунт, чтобы отправить пожертвование',
  403: 'Нельзя отправить пожертвование самому себе',
  404: 'Автор не найден',
  409: 'Предыдущее пожертвование могло пройти. Пока не отправляйте его повторно',
};
