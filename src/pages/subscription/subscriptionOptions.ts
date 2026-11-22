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

export const loadSubscriptionOptions: (authorId: string, signal: AbortSignal) => Promise<SubscriptionOptions | null> =
  async () => null;
