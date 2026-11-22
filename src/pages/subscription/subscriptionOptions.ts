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
