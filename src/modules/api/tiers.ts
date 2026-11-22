import { ApiError, request } from './request.ts';

export interface SubscriptionTier {
  id: string;
  name: string;
  description: string;
  price_minor: number;
  currency: string;
  status: 'open' | 'archived';
}

/** Загружает уровни автора и проверяет структуру ответа. */
export async function getMyTiers(signal: AbortSignal): Promise<{ items: SubscriptionTier[] }> {
  const response = await request<{ items: SubscriptionTier[] } | null>('/profile/me/tiers', { signal });
  if (!Array.isArray(response?.items)) {
    throw new ApiError(200, 'invalid subscription tiers response');
  }
  return response;
}
