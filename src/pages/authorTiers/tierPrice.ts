import type { SubscriptionTier } from '@/modules/api/tiers.ts';
import { formatMoney } from '@/utils/helpers/money.ts';

/** Сравнивает цены со всеми соседними уровнями, включая архивные. */
export function getTierPriceRules(tier: SubscriptionTier, items: SubscriptionTier[]) {
  const others = items.filter((item) => item.id !== tier.id);
  const current = tier.price_minor;
  const lower = Math.max(0, ...others.filter((item) => item.price_minor < current).map((item) => item.price_minor));
  const upper = Math.min(Infinity, ...others.filter((item) => item.price_minor > current).map((item) => item.price_minor));
  return {
    fixed: others.some((item) => item.status === 'archived' && item.price_minor === current),
    validate: (price: number) => {
      if (price === current) {
        return null;
      }
      if (others.some((item) => item.status === 'open' && item.price_minor === price)) {
        return 'У открытого уровня уже есть такая цена';
      }
      if (price <= lower) {
        return `Укажите цену больше ${formatMoney(lower, tier.currency)}`;
      }
      if (price >= upper) {
        return `Укажите цену меньше ${formatMoney(upper, tier.currency)}`;
      }
      return null;
    },
  };
}
