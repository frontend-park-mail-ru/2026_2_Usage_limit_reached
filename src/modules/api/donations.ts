import { request } from './request.ts';
import type { DonationInput, DonationResult, DonationsDirection, DonationsPage } from './donations.types.ts';

/** Получает минимальную сумму пожертвования в копейках. */
export const getDonationSettings = () => request<{ min_amount_minor: number }>('/donations/settings');

/**
 * Отправляет пожертвование автору.
 * @param authorId
 * @param data
 * @throws {ApiError}
 */
export const sendDonation = (authorId: string, data: DonationInput) =>
  request<DonationResult>(`/authors/${encodeURIComponent(authorId)}/donations`, { method: 'POST', data });

/**
 * Получает страницу полученных или отправленных пожертвований.
 * @param direction
 * @param cursor
 * @throws {ApiError}
 */
export const getDonations = (direction: DonationsDirection, cursor?: string | null) => {
  const query = cursor ? `?${new URLSearchParams({ cursor }).toString()}` : '';
  return request<DonationsPage>(`/profile/me/donations/${direction}${query}`);
};
