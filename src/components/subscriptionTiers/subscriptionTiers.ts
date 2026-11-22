import type { SubscriptionTier } from '@/modules/api/tiers.ts';
import { formatMoney } from '@/utils/helpers/money.ts';
import subscriptionTiersTemplate from './subscriptionTiers.hbs';

/** Загружает уровни и подключает повторный запрос в пределах списка. */
export function bindSubscriptionTiers(
  panel: HTMLElement,
  fetchTiers: (signal: AbortSignal) => Promise<SubscriptionTier[] | undefined>,
  emptyMessage: string,
  isCurrent: () => boolean,
): () => void {
  const lifecycle = new AbortController();
  const current = () => !lifecycle.signal.aborted && isCurrent();
  let busy = false;

  async function load(): Promise<void> {
    if (busy || !current()) {
      return;
    }
    busy = true;
    panel.innerHTML = subscriptionTiersTemplate({ message: 'Загружаем уровни подписки…' });
    try {
      const tiers = await fetchTiers(lifecycle.signal);
      if (tiers && current()) {
        panel.innerHTML = subscriptionTiersTemplate({
          message: tiers.length ? undefined : emptyMessage,
          tiers: tiers.map((tier) => ({
            ...tier,
            price: formatMoney(tier.price_minor, tier.currency),
            archived: tier.status === 'archived',
          })),
        });
      }
    } catch {
      if (current()) {
        panel.innerHTML = subscriptionTiersTemplate({ error: true });
      }
    } finally {
      busy = false;
    }
  }

  panel.addEventListener('click', (event) => {
    if (event.target instanceof Element && event.target.closest('[data-tiers-retry]')) {
      void load();
    }
  }, { signal: lifecycle.signal });
  void load();
  return () => lifecycle.abort();
}
