import type { DonateStep } from './donateDialog.types.ts';

export const DEFAULT_AMOUNT = '500';

export const DONATE_TITLES: Record<DonateStep, string> = {
  form: 'Пожертвовать',
  confirm: 'Подтверждение пожертвования',
  success: 'Спасибо за пожертвование',
};

export const SENDING_LABEL = 'Отправляем…';
export const SENT_MESSAGE = 'Пожертвование отправлено';

export const PAYMENT_FAILED_ERROR = 'Платёж не прошёл. Введённые данные не потеряны, попробуйте ещё раз';
export const DONATE_ERROR = 'Введённые данные не потеряны. Повторите попытку позже';

export const DONATE_ERROR_MESSAGES: Record<number, string> = {
  0: 'Введённые данные не потеряны. Проверьте соединение и повторите попытку',
  400: 'Проверьте сумму и сообщение',
  401: 'Войдите в аккаунт, чтобы отправить пожертвование',
  403: 'Нельзя отправить пожертвование самому себе',
  404: 'Автор не найден',
  409: 'Данные изменились. Проверьте их и повторите попытку',
};
