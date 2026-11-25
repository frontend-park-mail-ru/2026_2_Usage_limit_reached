import { Select } from '@/components/select/select.ts';
import { getMyTiers } from '@/modules/api/tiers.ts';
import type { SubscriptionTier } from '@/modules/api/tiers.ts';
import type { Post } from '@/modules/api/posts.types.ts';
import { isSessionCurrent, runSessionRequest } from '@/modules/auth/auth.actions.ts';
import type { SessionContext } from '@/modules/auth/auth.types.ts';
import { requireElement } from '@/utils/helpers/dom.ts';

/** Подключает выбор минимального уровня подписки. */
export function bindPostAccess(form: HTMLFormElement, post: Post | null, context: SessionContext, signal: AbortSignal) {
  const initialTierId = post?.min_tier_id ?? null;
  const input = requireElement<HTMLInputElement>(form, '#post-access-tier');
  const root = requireElement<HTMLElement>(form, '.post-access .select');
  const list = requireElement<HTMLElement>(root, '.select__list');
  const hint = requireElement<HTMLElement>(form, '[data-post-access-hint]');
  const status = requireElement<HTMLElement>(form, '[data-post-access-status]');
  const error = requireElement<HTMLElement>(form, '#post-access-tier-error');
  const retry = requireElement<HTMLButtonElement>(form, '[data-post-access-retry]');
  const publicLabel = 'Для всех';
  const savedLabel = 'Сохранённый уровень';
  const schedule = requireElement<HTMLElement>(form, '[data-access-schedule]');
  const stages = requireElement(schedule, '[data-access-stages]');
  const stageTemplate = requireElement<HTMLTemplateElement>(schedule, '[data-access-stage]');
  const savedStages = post?.access_schedule ?? [];
  const stageDate = new Intl.DateTimeFormat('ru-RU', { day: 'numeric', month: 'long' });
  const stageTime = new Intl.DateTimeFormat('ru-RU', { hour: '2-digit', minute: '2-digit' });
  let savedTierId = initialTierId;
  let selectedTierId = initialTierId;
  let rejectedTierId: string | undefined;
  let tiers: SubscriptionTier[] = [];
  let select: Select | undefined;
  function renderStages(): void {
    stages.replaceChildren(...savedStages.map((stage) => {
      const row = stageTemplate.content.cloneNode(true) as DocumentFragment;
      const time = requireElement<HTMLTimeElement>(row, 'time');
      const tier = tiers.find(({ id }) => id === stage.min_tier_id);
      time.dateTime = stage.starts_at;
      const start = new Date(stage.starts_at);
      time.textContent = `${stageDate.format(start)}, ${stageTime.format(start)}`;
      requireElement(row, 'span').textContent = stage.min_tier_id ? tier?.name ?? savedLabel : publicLabel;
      return row;
    }));
  }

  renderStages();
  const updateHint = (tierId: string | null) => {
    hint.textContent = tierId ? 'Пост увидят подписчики этого уровня и уровней выше' : 'Пост будет доступен всем';
  };
  input.value = initialTierId ? savedLabel : publicLabel;
  updateHint(initialTierId);
  input.addEventListener('input', () => {
    selectedTierId = list.querySelector<HTMLElement>('[aria-selected="true"]')?.dataset.tierId || null;
    updateHint(selectedTierId);
    if (selectedTierId !== rejectedTierId) {
      error.textContent = '';
      input.removeAttribute('aria-invalid');
    }
  }, { signal });
  retry.addEventListener('click', () => { void load(); }, { signal });
  signal.addEventListener('abort', () => select?.destroy(), { once: true });

  void load();
  return {
    getChange: () => selectedTierId === savedTierId ? undefined : selectedTierId,
    needsSelection() {
      if (selectedTierId !== rejectedTierId) {
        return false;
      }
      root.scrollIntoView({ block: 'nearest' });
      return true;
    },
    rejectTier(tierId: string) {
      rejectedTierId = tierId;
      error.textContent = 'Этот уровень больше недоступен. Выберите другой вариант';
      input.setAttribute('aria-invalid', 'true');
      root.scrollIntoView({ block: 'nearest' });
      void load();
    },
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
      if (tier.id === savedTierId || (tier.status === 'open' && tier.id !== rejectedTierId)) {
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
    select?.destroy();
    select = undefined;
    input.disabled = true;
    retry.hidden = true;
    status.textContent = 'Загружаем уровни…';
    try {
      const response = await runSessionRequest(context, () => getMyTiers(signal));
      if (!response || signal.aborted || !isSessionCurrent(context)) {
        return;
      }
      tiers = response.items;
      renderStages();
      renderOptions();
      status.textContent = '';
      input.disabled = false;
    } catch {
      if (!signal.aborted && isSessionCurrent(context)) {
        status.textContent = 'Не удалось загрузить уровни подписки';
        retry.hidden = false;
      }
    }
  }
}
