import { request } from '@/modules/api/request.ts';

export interface SubscriptionOption {
  id: string;
  name: string;
  description: string;
  price_minor: number;
  currency: string;
}

export interface SubscriptionOptions {
  mode: 'demo';
  current_subscription: {
    id: string;
    tier: { id: string; name: string; status: 'open' | 'archived' };
    price_minor: number;
    currency: string;
    period_ends_at: string;
  } | null;
  items: SubscriptionOption[];
}

/** Загружает доступные уровни и текущую подписку читателя. */
export function loadSubscriptionOptions(authorId: string, signal: AbortSignal, postId?: string): Promise<SubscriptionOptions> {
  const query = postId ? `?${new URLSearchParams({ post_id: postId })}` : '';
  return request<SubscriptionOptions>(`/authors/${encodeURIComponent(authorId)}/subscription-options${query}`, { signal });
}

export interface SubscriptionConfirmation {
  action: 'subscribe' | 'upgrade';
  tier_id: string;
  expected_subscription_id: string | null;
  expected_current_tier_id: string | null;
  expected_price_minor: number;
  post_id?: string;
  request_key: string;
}

/** Подтверждает выбранные условия подписки. */
export function confirmSubscription(authorId: string, data: SubscriptionConfirmation) {
  return request<Pick<SubscriptionOptions, 'mode' | 'current_subscription'>>(
    `/authors/${encodeURIComponent(authorId)}/subscriptions`, { method: 'POST', data });
}
