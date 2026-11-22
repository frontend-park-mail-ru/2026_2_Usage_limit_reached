import { publicProfileRoute, subscriptionRoute } from '@/app/paths.ts';
import type { Navigate, NavigationPath } from '@/app/paths.ts';
import type { RouteParams } from '@/app/router.types.ts';
import { getPublicProfile } from '@/modules/api/profile.ts';
import { bindAvatarFallback } from '@/modules/profile/avatarFallback.ts';
import { AVATAR_PLACEHOLDER } from '@/modules/profile/profile.constants.ts';
import { formatMoney } from '@/utils/helpers/money.ts';
import { loadSubscriptionOptions } from './subscriptionOptions.ts';
import subscriptionTemplate from './subscription.hbs';

const CHOOSE = 'Выберите уровень';

/** Показывает экран выбора до загрузки данных автора. */
export function renderSubscription(): string {
  return subscriptionTemplate({ heading: CHOOSE, message: 'Загружаем уровни…' });
}

/** Загружает профиль и показывает варианты подписки. */
export function initSubscription(root: HTMLElement, navigate: Navigate, { username }: RouteParams): () => void {
  const lifecycle = new AbortController();
  const { signal } = lifecycle;
  const backHref = publicProfileRoute(username);
  const route = subscriptionRoute(username);
  const search = new URLSearchParams(window.location.search);
  const selectedId = search.get('tier');
  const choiceHref = (id: string, confirm = false): NavigationPath =>
    `${route}?${new URLSearchParams(confirm ? { tier: id, step: 'confirm' } : { tier: id })}`;
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
      const items = options?.items.map((tier) => ({
        ...tier, price: formatMoney(tier.price_minor, tier.currency), selected: tier.id === selectedId,
      })) ?? [];
      const confirmation = search.get('step') === 'confirm' ? items.find((tier) => tier.selected) : undefined;
      const tiers = subscription
        ? [{ current: true, name: subscription.tier.name, price: formatMoney(subscription.price_minor, subscription.currency) }, ...items]
        : items;
      root.innerHTML = subscriptionTemplate({
        heading: confirmation ? (subscription ? 'Повышение уровня' : 'Оформление подписки')
          : (subscription ? 'Выберите новый уровень' : CHOOSE),
        upgrade: !!subscription,
        backHref: confirmation ? choiceHref(confirmation.id) : backHref,
        confirmation,
        currentName: subscription?.tier.name,
        author: { name: user.nickname, avatar: user.avatar_url ?? AVATAR_PLACEHOLDER },
        tiers,
        message: items.length ? undefined : 'Нет доступных уровней подписки',
      });
    } catch {
      if (!signal.aborted) {
        root.innerHTML = subscriptionTemplate({ heading: CHOOSE, backHref, message: 'Не удалось открыть выбор уровня' });
      }
    }
  }

  root.addEventListener('click', (event) => {
    const link = event.target instanceof Element && event.target.closest('a[data-link]');
    if (selectedId && search.get('step') === 'confirm' && link && link.getAttribute('href') === choiceHref(selectedId)
      && event.button === 0 && !event.ctrlKey && !event.metaKey && !event.shiftKey && !event.altKey) {
      event.preventDefault();
      if (history.state?.from === choiceHref(selectedId)) {
        history.back();
        return;
      }
      navigate(choiceHref(selectedId), { replace: true });
      return;
    }
    const button = event.target instanceof Element && event.target.closest<HTMLButtonElement>('[data-tier-id]');
    const id = button && button.dataset.tierId;
    if (id) {
      history.replaceState(history.state, '', choiceHref(id));
      navigate(choiceHref(id, true));
    }
  }, { capture: true, signal });
  void load();
  return () => {
    lifecycle.abort();
    unbindAvatar();
  };
}
