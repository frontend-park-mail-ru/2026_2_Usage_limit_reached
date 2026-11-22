import { postRoute, publicProfileRoute, ROUTES, subscriptionRoute } from '@/app/paths.ts';
import type { Navigate, NavigationPath } from '@/app/paths.ts';
import type { RouteParams } from '@/app/router.types.ts';
import { getPublicProfile } from '@/modules/api/profile.ts';
import { ApiError } from '@/modules/api/request.ts';
import { checkSession } from '@/modules/auth/auth.actions.ts';
import { authStore } from '@/modules/auth/auth.store.ts';
import { bindAvatarFallback } from '@/modules/profile/avatarFallback.ts';
import { AVATAR_PLACEHOLDER } from '@/modules/profile/profile.constants.ts';
import { formatMoney } from '@/utils/helpers/money.ts';
import { loadSubscriptionOptions } from './subscriptionOptions.ts';
import subscriptionTemplate from './subscription.hbs';

const CHOOSE = 'Выберите уровень';
const subscriptionEndFormat = new Intl.DateTimeFormat('ru-RU', { dateStyle: 'long', timeStyle: 'short' });

/** Показывает экран выбора до загрузки данных автора. */
export function renderSubscription(): string {
  return subscriptionTemplate({ heading: CHOOSE, message: 'Загружаем уровни…' });
}

/** Загружает профиль и показывает варианты подписки. */
export function initSubscription(root: HTMLElement, navigate: Navigate, { username }: RouteParams): () => void {
  const lifecycle = new AbortController();
  const { signal } = lifecycle;
  const search = new URLSearchParams(window.location.search);
  const postId = search.get('post_id') || undefined;
  const backHref = postId ? postRoute(postId) : publicProfileRoute(username);
  const route = subscriptionRoute(username);
  const contextQuery: Record<string, string> = postId ? { post_id: postId } : {};
  const selectedId = search.get('tier');
  const choiceHref = (id: string, confirm = false): NavigationPath =>
    `${route}?${new URLSearchParams({ ...contextQuery, tier: id, ...(confirm ? { step: 'confirm' } : {}) })}`;
  const unbindAvatar = bindAvatarFallback(root);
  const verifySession = () => checkSession().catch(() => {});

  async function load(): Promise<void> {
    root.innerHTML = subscriptionTemplate({ heading: CHOOSE, message: 'Загружаем уровни…', backHref, postId });
    try {
      const { user, author } = await getPublicProfile(username);
      if (signal.aborted) {
        return;
      }
      const options = author ? await loadSubscriptionOptions(user.id, signal, postId) : null;
      if (search.get('step') === 'confirm') {
        await session;
      }
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
        postId,
        confirmation,
        demo: options?.mode === 'demo',
        sessionUnknown: authStore.getState().status === 'unknown',
        loginHref: authStore.getState().status === 'guest'
          ? `${ROUTES.login}?${new URLSearchParams({ ...contextQuery, subscribe_to: username })}` : undefined,
        currentName: subscription?.tier.name,
        currentEnd: subscription && subscriptionEndFormat.format(new Date(subscription.period_ends_at)),
        author: { name: user.nickname, avatar: user.avatar_url ?? AVATAR_PLACEHOLDER },
        tiers,
        message: items.length ? undefined : 'Нет доступных уровней подписки',
      });
    } catch (error) {
      if (!signal.aborted) {
        if (postId && error instanceof ApiError && error.status === 404) {
          navigate(postRoute(postId), { replace: true });
        } else {
          root.innerHTML = subscriptionTemplate({ heading: CHOOSE, backHref, postId, retry: true,
            message: 'Не удалось загрузить уровни подписки' });
        }
      }
    }
  }

  root.addEventListener('click', (event) => {
    const retrySession = event.target instanceof Element && event.target.closest<HTMLButtonElement>('[data-session-retry]');
    if (retrySession) {
      retrySession.disabled = true;
      void verifySession().finally(() => { retrySession.disabled = false; });
      return;
    }
    if (event.target instanceof Element && event.target.closest('[data-options-retry]')) {
      void load();
      return;
    }
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
  const session = authStore.getState().status === 'unknown' ? verifySession() : undefined;
  void load();
  return () => {
    lifecycle.abort();
    unbindAvatar();
  };
}
