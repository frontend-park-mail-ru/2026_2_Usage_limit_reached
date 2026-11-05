import { MINOR_IN_MAJOR } from './money.constants.ts';

/**
 * Смена разменной единицы.
 * @param amount
 */
export const toMinor = (amount: number): number => Math.round(amount * MINOR_IN_MAJOR);

/**
 * Сумма.
 * @param amountMinor
 * @param currency
 */
export const formatMoney = (amountMinor: number, currency = 'RUB'): string => {
  const amount = amountMinor / MINOR_IN_MAJOR;
  try {
    return new Intl.NumberFormat('ru', { style: 'currency', currency, minimumFractionDigits: 0, maximumFractionDigits: 2 })
      .format(amount);
  } catch {
    return `${new Intl.NumberFormat('ru', { maximumFractionDigits: 2 }).format(amount)} ${currency}`.trimEnd();
  }
};
