import { MINOR_IN_MAJOR } from './money.constants.ts';
import type { DonationCurrency } from '../../modules/api/donations.types.ts';

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
export const formatMoney = (amountMinor: number, currency: DonationCurrency = 'RUB'): string =>
  new Intl.NumberFormat('ru', { style: 'currency', currency, minimumFractionDigits: 0, maximumFractionDigits: 2 })
    .format(amountMinor / MINOR_IN_MAJOR);
