import { postRoute, publicProfileRoute, ROUTES, subscriptionRoute } from '@/app/paths.ts';
import type { Navigate, NavigationPath } from '@/app/paths.ts';
import type { RouteParams } from '@/app/router.types.ts';
import { getPost } from '@/modules/api/posts.ts';
import { getPublicProfile } from '@/modules/api/profile.ts';
import { ApiError } from '@/modules/api/request.ts';
import { checkSession, getSessionContext, runSessionMutation } from '@/modules/auth/auth.actions.ts';
import { authStore } from '@/modules/auth/auth.store.ts';
import { bindAvatarFallback } from '@/modules/profile/avatarFallback.ts';
import { AVATAR_PLACEHOLDER } from '@/modules/profile/profile.constants.ts';
import { formatMoney } from '@/utils/helpers/money.ts';
import { confirmSubscription, loadSubscriptionOptions } from './subscriptionOptions.ts';
import type { SubscriptionConfirmation } from './subscriptionOptions.ts';
import subscriptionTemplate from './subscription.hbs';

const CHOOSE = 'Выберите уровень';
const subscriptionEndFormat = new Intl.DateTimeFormat('ru-RU', { dateStyle: 'long', timeStyle: 'short' });
const pendingKeys = new Map<string, {
  conditions: string;
  key: string;
  uncertain?: Pick<SubscriptionConfirmation, 'action' | 'tier_id'>;
}>();
const submissions = new Map<string, Promise<void>>();
const subscriptionTarget = (viewerId: string | undefined, authorId: string) => JSON.stringify([viewerId, authorId]);
const conflicts = new Set(['subscription_changed', 'subscription_tier_unavailable', 'subscription_price_changed', 'request_key_conflict']);

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
  let confirm: (() => Promise<void>) | undefined;
  let notice = '';

  async function load(reconciling = false): Promise<void> {
    confirm = undefined;
    root.innerHTML = subscriptionTemplate({ heading: CHOOSE, message: 'Загружаем уровни…', backHref, postId });
    try {
      const { user, author } = postId
        ? { user: (await getPost(postId)).author, author: true }
        : await getPublicProfile(username);
      if (signal.aborted) {
        return;
      }
      if (postId && user.username !== username) {
        finish();
        return;
      }
      const target = subscriptionTarget(authStore.getState().user?.id, user.id);
      if (!reconciling) {
        await submissions.get(target);
      }
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
      const uncertain = pendingKeys.get(target)?.uncertain;
      let uncertainNotice = '';
      if (uncertain && subscription?.tier.id === uncertain.tier_id) {
        pendingKeys.delete(target);
        if (postId || search.get('step') === 'confirm') {
          finish();
          return;
        }
      } else if (uncertain) {
        uncertainNotice = uncertain.action === 'subscribe'
          ? 'Пока неясно, оформилась ли подписка. Проверьте её статус перед повтором'
          : 'Пока неясно, изменился ли уровень. Проверьте текущий уровень перед повтором';
      }
      const items = options?.items.map((tier) => ({
        ...tier, price: formatMoney(tier.price_minor, tier.currency), selected: tier.id === selectedId,
      })) ?? [];
      const confirmation = search.get('step') === 'confirm' ? items.find((tier) => tier.selected) : undefined;
      if (confirmation && options?.mode === 'demo') {
        confirm = () => submit(user.id, {
          action: subscription ? 'upgrade' : 'subscribe',
          tier_id: confirmation.id,
          expected_subscription_id: subscription?.id ?? null,
          expected_current_tier_id: subscription?.tier.id ?? null,
          expected_price_minor: confirmation.price_minor,
          ...(postId ? { post_id: postId } : {}),
        });
      }
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
        notice: notice || uncertainNotice,
        canConfirm: !!confirm,
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

  function finish(): void {
    navigate(postId ? backHref : route, { replace: true });
  }

  async function submit(authorId: string, conditions: Omit<SubscriptionConfirmation, 'request_key'>): Promise<void> {
    const viewer = authStore.getState().user;
    if (!viewer) {
      return;
    }
    const target = subscriptionTarget(viewer.id, authorId);
    if (submissions.has(target)) {
      return;
    }
    const button = root.querySelector<HTMLButtonElement>('[data-subscription-confirm]');
    const message = root.querySelector<HTMLElement>('[data-subscription-notice]');
    if (!button || !message) {
      return;
    }
    let complete!: () => void;
    submissions.set(target, new Promise<void>((resolve) => { complete = resolve; }));
    button.disabled = true;
    message.textContent = 'Сохраняем подписку…';
    try {
      if (!getSessionContext()) {
        await verifySession();
      }
      const context = getSessionContext();
      if (signal.aborted || !context || context.userId !== viewer.id) {
        message.textContent = 'Не удалось проверить, вошли ли вы в аккаунт. Попробуйте ещё раз';
        return;
      }
      const signature = JSON.stringify(conditions);
      const previous = pendingKeys.get(target);
      const key = previous?.conditions === signature ? previous.key : crypto.randomUUID();
      pendingKeys.set(target, { conditions: signature, key });
      const result = await runSessionMutation(context, () => confirmSubscription(authorId, { ...conditions, request_key: key }));
      if (result) {
        pendingKeys.delete(target);
        if (!signal.aborted) {
          finish();
        }
      }
    } catch (error) {
      const unknownResult = error instanceof ApiError && !error.isCsrfError
        && (error.isMutationTimeout || [0, 502, 503, 504].includes(error.status));
      const pending = pendingKeys.get(target);
      if (unknownResult && pending) {
        pending.uncertain = { action: conditions.action, tier_id: conditions.tier_id };
      }
      if (signal.aborted || authStore.getState().user?.id !== viewer.id) {
        return;
      }
      if (unknownResult) {
        await load(true);
      } else {
        pendingKeys.delete(target);
        if (error instanceof ApiError && postId && (error.code === 'post_access_changed' || error.status === 404)) {
          finish();
        } else if (error instanceof ApiError && error.status === 409 && conflicts.has(error.code)) {
          notice = error.code === 'subscription_tier_unavailable'
            ? 'Этот уровень больше недоступен'
            : 'Проверьте текущую подписку, доступные уровни и цены';
          await load(true);
        } else {
          message.textContent = conditions.action === 'subscribe'
            ? 'Не удалось оформить подписку. Попробуйте ещё раз'
            : 'Не удалось повысить уровень. Попробуйте ещё раз';
        }
      }
    } finally {
      submissions.delete(target);
      complete();
      button.disabled = false;
    }
  }

  root.addEventListener('click', (event) => {
    if (event.target instanceof Element && event.target.closest('[data-subscription-confirm]')) {
      void confirm?.();
      return;
    }
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
