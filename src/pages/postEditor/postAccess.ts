import { Select } from '@/components/select/select.ts';
import { getMyTiers } from '@/modules/api/tiers.ts';
import type { SubscriptionTier } from '@/modules/api/tiers.ts';
import { isSessionCurrent, runSessionRequest } from '@/modules/auth/auth.actions.ts';
import type { SessionContext } from '@/modules/auth/auth.types.ts';
import { requireElement } from '@/utils/helpers/dom.ts';

/** Подключает выбор минимального уровня подписки. */
export function bindPostAccess(form: HTMLFormElement, initialTierId: string | null, context: SessionContext, signal: AbortSignal) {
  const input = requireElement<HTMLInputElement>(form, '#post-access-tier');
  const root = requireElement<HTMLElement>(form, '.post-access .select');
  const list = requireElement<HTMLElement>(root, '.select__list');
  const hint = requireElement<HTMLElement>(form, '[data-post-access-hint]');
  const status = requireElement<HTMLElement>(form, '[data-post-access-status]');
  const publicLabel = 'Для всех';
  const savedLabel = 'Сохранённый уровень';
  let savedTierId = initialTierId;
  let selectedTierId = initialTierId;
  let tiers: SubscriptionTier[] = [];
  let select: Select | undefined;
  const updateHint = (tierId: string | null) => {
    hint.textContent = tierId ? 'Пост увидят подписчики этого уровня и уровней выше' : 'Пост будет доступен всем';
  };
  input.value = initialTierId ? savedLabel : publicLabel;
  input.disabled = true;
  updateHint(initialTierId);
  status.textContent = 'Загружаем уровни…';
  input.addEventListener('input', () => {
    selectedTierId = list.querySelector<HTMLElement>('[aria-selected="true"]')?.dataset.tierId || null;
    updateHint(selectedTierId);
  }, { signal });
  signal.addEventListener('abort', () => select?.destroy(), { once: true });

  void load();
  return {
    getChange: () => selectedTierId === savedTierId ? undefined : selectedTierId,
    markSaved() {
      if (selectedTierId !== savedTierId) {
        savedTierId = selectedTierId;
        renderOptions();
      }
    },
  };

  function renderOptions(): void {
    select?.destroy();
    list.replaceChildren();
    const options: { id: string | null; label: string }[] = [{ id: null, label: publicLabel }];
    for (const tier of tiers) {
      if (tier.status === 'open' || tier.id === savedTierId) {
        options.push({ id: tier.id, label: tier.status === 'archived' ? `${tier.name} · В архиве` : tier.name });
      }
    }
    if (savedTierId && !options.some(({ id }) => id === savedTierId)) {
      options.push({ id: savedTierId, label: savedLabel });
    }
    options.forEach(({ id, label }, index) => {
      const option = document.createElement('li');
      option.id = `${input.id}-option-${index}`;
      option.className = 'select__option';
      option.setAttribute('role', 'option');
      option.setAttribute('aria-selected', String(id === selectedTierId));
      option.dataset.value = label;
      option.dataset.tierId = id ?? '';
      option.textContent = label;
      list.append(option);
      if (id === selectedTierId) {
        input.value = label;
      }
    });
    select = new Select(root);
  }

  async function load(): Promise<void> {
    try {
      const response = await runSessionRequest(context, () => getMyTiers(signal));
      if (!response || signal.aborted || !isSessionCurrent(context)) {
        return;
      }
      tiers = response.items;
      renderOptions();
      status.textContent = '';
      input.disabled = false;
    } catch {
      if (!signal.aborted && isSessionCurrent(context)) {
        status.textContent = 'Не удалось загрузить уровни подписки';
      }
    }
  }
}
