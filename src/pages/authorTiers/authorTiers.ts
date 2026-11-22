import { getMyTiers } from '@/modules/api/tiers.ts';
import { checkSession, getSessionContext, runSessionRequest } from '@/modules/auth/auth.actions.ts';
import { bindSubscriptionTiers } from '@/components/subscriptionTiers/subscriptionTiers.ts';
import { requireElement } from '@/utils/helpers/dom.ts';
import authorTiersTemplate from './authorTiers.hbs';

/** Возвращает страницу управления уровнями автора. */
export function renderAuthorTiers(): string {
  return authorTiersTemplate({});
}

/** Проверяет права и загружает открытые и архивные уровни. */
export function initAuthorTiers(root: HTMLElement): () => void {
  const panel = requireElement<HTMLElement>(root, '[data-author-tiers]');
  return bindSubscriptionTiers(panel, async (signal) => {
    const profile = await checkSession();
    if (signal.aborted || !profile) {
      return undefined;
    }
    if (!profile.author) {
      panel.textContent = 'Управление уровнями подписки доступно авторам';
      return undefined;
    }
    const context = getSessionContext();
    if (!context || context.userId !== profile.user.id) {
      return undefined;
    }
    return (await runSessionRequest(context, () => getMyTiers(signal)))?.items;
  }, 'Добавьте уровень, чтобы читатели могли оформить подписку', () => panel.isConnected);
}
