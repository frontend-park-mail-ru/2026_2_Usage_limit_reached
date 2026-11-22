import { publicProfileRoute } from '@/app/paths.ts';
import type { Navigate } from '@/app/paths.ts';
import type { RouteParams } from '@/app/router.types.ts';
import { getPublicProfile } from '@/modules/api/profile.ts';
import { bindAvatarFallback } from '@/modules/profile/avatarFallback.ts';
import { AVATAR_PLACEHOLDER } from '@/modules/profile/profile.constants.ts';
import { formatMoney } from '@/utils/helpers/money.ts';
import { loadSubscriptionOptions } from './subscriptionOptions.ts';
import subscriptionTemplate from './subscription.hbs';

const CHOOSE = 'Выберите уровень';
const UNAVAILABLE = 'Нет доступных уровней подписки';

/** Показывает экран выбора до загрузки данных автора. */
export function renderSubscription(): string {
  return subscriptionTemplate({ heading: CHOOSE, message: 'Загружаем уровни…' });
}

/** Загружает профиль и показывает варианты подписки. */
export function initSubscription(root: HTMLElement, _navigate: Navigate, { username }: RouteParams): () => void {
  const lifecycle = new AbortController();
  const { signal } = lifecycle;
  const backHref = publicProfileRoute(username);
  const unbindAvatar = bindAvatarFallback(root);
  root.innerHTML = subscriptionTemplate({ heading: CHOOSE, message: 'Загружаем уровни…', backHref });

  async function load(): Promise<void> {
    try {
      const { user, author } = await getPublicProfile(username);
      if (signal.aborted) {
        return;
      }
      const options = author ? await loadSubscriptionOptions(user.id, signal) : null;
      if (signal.aborted) {
        return;
      }
      const subscription = options?.current_subscription;
      const items = options?.items.map((tier) => ({ ...tier, price: formatMoney(tier.price_minor, tier.currency) })) ?? [];
      const tiers = subscription
        ? [{ current: true, name: subscription.tier.name, price: formatMoney(subscription.price_minor, subscription.currency) }, ...items]
        : items;
      root.innerHTML = subscriptionTemplate({
        heading: subscription ? 'Выберите новый уровень' : CHOOSE,
        upgrade: !!subscription,
        backHref,
        author: { name: user.nickname, avatar: user.avatar_url ?? AVATAR_PLACEHOLDER },
        tiers,
        message: items.length ? undefined : UNAVAILABLE,
      });
    } catch {
      if (!signal.aborted) {
        root.innerHTML = subscriptionTemplate({ heading: CHOOSE, backHref, message: 'Не удалось открыть выбор уровня' });
      }
    }
  }

  root.addEventListener('click', (event) => {
    const button = event.target instanceof Element && event.target.closest<HTMLButtonElement>('[data-tier-id]');
    if (button) {
      root.querySelector('[data-tier-id][aria-pressed="true"]')?.setAttribute('aria-pressed', 'false');
      button.setAttribute('aria-pressed', 'true');
    }
  }, { signal });
  void load();
  return () => {
    lifecycle.abort();
    unbindAvatar();
  };
}
