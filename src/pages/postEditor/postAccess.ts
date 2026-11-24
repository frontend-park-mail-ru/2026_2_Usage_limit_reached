import { Select } from '@/components/select/select.ts';
import { getMyTiers } from '@/modules/api/tiers.ts';
import { isSessionCurrent, runSessionRequest } from '@/modules/auth/auth.actions.ts';
import type { SessionContext } from '@/modules/auth/auth.types.ts';
import { requireElement } from '@/utils/helpers/dom.ts';

/** Подключает выбор минимального уровня подписки. */
export function bindPostAccess(form: HTMLFormElement, initialTierId: string | null, context: SessionContext, signal: AbortSignal): void {
  const input = requireElement<HTMLInputElement>(form, '#post-access-tier');
  const root = requireElement<HTMLElement>(form, '.post-access .select');
  const list = requireElement<HTMLElement>(root, '.select__list');
  const hint = requireElement<HTMLElement>(form, '[data-post-access-hint]');
  const status = requireElement<HTMLElement>(form, '[data-post-access-status]');
  const publicLabel = 'Для всех';
  const savedLabel = 'Сохранённый уровень';
  const updateHint = (tierId: string | null) => {
    hint.textContent = tierId ? 'Пост увидят подписчики этого уровня и уровней выше' : 'Пост будет доступен всем';
  };
  input.value = initialTierId ? savedLabel : publicLabel;
  input.disabled = true;
  updateHint(initialTierId);
  status.textContent = 'Загружаем уровни…';

  void load();

  async function load(): Promise<void> {
    try {
      const response = await runSessionRequest(context, () => getMyTiers(signal));
      if (!response || signal.aborted || !isSessionCurrent(context)) {
        return;
      }
      const options: { id: string | null; label: string }[] = [{ id: null, label: publicLabel }];
      for (const tier of response.items) {
        if (tier.status === 'open' || tier.id === initialTierId) {
          options.push({ id: tier.id, label: tier.status === 'archived' ? `${tier.name} · В архиве` : tier.name });
        }
      }
      if (initialTierId && !options.some(({ id }) => id === initialTierId)) {
        options.push({ id: initialTierId, label: savedLabel });
      }
      options.forEach(({ id, label }, index) => {
        const option = document.createElement('li');
        option.id = `${input.id}-option-${index}`;
        option.className = 'select__option';
        option.setAttribute('role', 'option');
        option.setAttribute('aria-selected', String(id === initialTierId));
        option.dataset.value = label;
        option.dataset.tierId = id ?? '';
        option.textContent = label;
        list.append(option);
        if (id === initialTierId) {
          input.value = label;
        }
      });
      const select = new Select(root);
      signal.addEventListener('abort', () => select.destroy(), { once: true });
      input.addEventListener('input', () => {
        updateHint(list.querySelector<HTMLElement>('[aria-selected="true"]')?.dataset.tierId || null);
      }, { signal });
      status.textContent = '';
      input.disabled = false;
    } catch {
      if (!signal.aborted && isSessionCurrent(context)) {
        status.textContent = 'Не удалось загрузить уровни подписки';
      }
    }
  }
}
