import { ApiError, request } from './request.ts';

export interface SubscriptionTier {
  id: string;
  name: string;
  description: string;
  price_minor: number;
  currency: string;
  status: 'open' | 'archived';
}

export type TierInput = Pick<SubscriptionTier, 'name' | 'description' | 'price_minor'>;

/** Создаёт открытый уровень подписки автора. */
export const createTier = (data: TierInput) =>
  request<SubscriptionTier>('/profile/me/tiers', { method: 'POST', data });

/** Сохраняет изменённые поля или архивирует уровень. */
export const updateTier = (id: string, data: Partial<TierInput> | { status: 'archived' }) =>
  request<SubscriptionTier>(`/profile/me/tiers/${encodeURIComponent(id)}`, { method: 'PATCH', data });

/** Загружает уровни автора и проверяет структуру ответа. */
export async function getMyTiers(signal: AbortSignal): Promise<{ items: SubscriptionTier[] }> {
  const response = await request<{ items: SubscriptionTier[] } | null>('/profile/me/tiers', { signal });
  if (!Array.isArray(response?.items)) {
    throw new ApiError(200, 'invalid subscription tiers response');
  }
  return response;
}
