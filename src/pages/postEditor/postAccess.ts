import { Select } from '@/components/select/select.ts';
import { getMyTiers } from '@/modules/api/tiers.ts';
import type { SubscriptionTier } from '@/modules/api/tiers.ts';
import type { Post, PostAccessStage } from '@/modules/api/posts.types.ts';
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
  const stageDate = new Intl.DateTimeFormat('ru-RU', { day: 'numeric', month: 'long' });
  const stageTime = new Intl.DateTimeFormat('ru-RU', { hour: '2-digit', minute: '2-digit' });
  let savedTierId = initialTierId;
  let selectedTierId = initialTierId;
  let rejectedTierId: string | undefined;
  let tiers: SubscriptionTier[] = [];
  let select: Select | undefined;
  const refreshStages = new Map<HTMLDetailsElement, () => void>();
  const addStage = requireElement<HTMLButtonElement>(schedule, '[data-stage-add]');
  function appendStage(initial?: PostAccessStage): void {
    const fragment = stageTemplate.content.cloneNode(true) as DocumentFragment;
    const row = requireElement<HTMLDetailsElement>(fragment, 'details');
    const date = requireElement<HTMLInputElement>(row, 'input[type="date"]');
    const clock = requireElement<HTMLInputElement>(row, 'input[type="time"]');
    const tierInput = requireElement<HTMLSelectElement>(row, 'select');
    const time = requireElement<HTMLTimeElement>(row, 'time');
    const title = requireElement(row, 'summary span');
    let start = initial?.starts_at ?? '';
    let tierId = initial?.min_tier_id ?? null;
    if (start) {
      const local = new Date(start);
      local.setMinutes(local.getMinutes() - local.getTimezoneOffset());
      [date.value, clock.value] = local.toISOString().slice(0, 16).split('T');
    }
    function updateTitle(): void {
      time.dateTime = start;
      time.textContent = start ? `${stageDate.format(new Date(start))}, ${stageTime.format(new Date(start))}` : '';
      title.textContent = tierId ? tiers.find(({ id }) => id === tierId)?.name ?? savedLabel : publicLabel;
    }
    function refresh(): void {
      const selected = tierInput.selectedIndex < 0 ? tierId ?? '' : tierInput.value;
      const options = tiers.filter(({ id, status }) => status === 'open' || id === initial?.min_tier_id)
        .map(({ name, id }) => new Option(name, id));
      if (selected && !options.some(({ value }) => value === selected)) {
        options.push(new Option(savedLabel, selected));
      }
      tierInput.replaceChildren(new Option(publicLabel, ''), ...options);
      tierInput.value = selected;
      updateTitle();
    }
    refreshStages.set(row, refresh);
    refresh();
    requireElement(row, '[data-stage-done]').addEventListener('click', () => {
      if (!date.reportValidity() || !clock.reportValidity()) {
        return;
      }
      const next = new Date(`${date.value}T${clock.value}`);
      if (!start || Math.floor(+new Date(start) / 60000) !== Math.floor(+next / 60000)) {
        start = next.toISOString();
      }
      tierId = tierInput.value || null;
      updateTitle();
      row.open = false;
      requireElement<HTMLElement>(row, 'summary').focus();
    });
    requireElement(row, '[data-stage-delete]').addEventListener('click', () => {
      refreshStages.delete(row);
      row.remove();
      addStage.focus();
    });
    row.open = !initial;
    stages.append(fragment);
    if (!initial) {
      date.focus();
    }
  }

  post?.access_schedule?.forEach(appendStage);
  addStage.addEventListener('click', () => appendStage(), { signal });
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
      refreshStages.forEach((refresh) => refresh());
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
