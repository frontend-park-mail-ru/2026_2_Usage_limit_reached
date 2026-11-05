import { request } from './request.ts';
import type { DonationInput, DonationResult, DonationsPage } from './donations.types.ts';

/**
 * Отправляет пожертвование автору.
 * @param authorId
 * @param data
 * @throws {ApiError}
 */
export const sendDonation = (authorId: string, data: DonationInput) =>
  request<DonationResult>(`/authors/${encodeURIComponent(authorId)}/donations`, { method: 'POST', data });

/**
 * Получает страницу полученных пожертвований.
 * @param cursor
 * @throws {ApiError}
 */
export const getReceivedDonations = (cursor?: string | null) => {
  const query = cursor ? `?${new URLSearchParams({ cursor }).toString()}` : '';
  return request<DonationsPage>(`/profile/me/donations/received${query}`);
};
