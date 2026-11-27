import { Select } from '@/components/select/select.ts';
import { getMyTiers } from '@/modules/api/tiers.ts';
import type { SubscriptionTier } from '@/modules/api/tiers.ts';
import type { Post, PostAccessStage } from '@/modules/api/posts.types.ts';
import { isSessionCurrent, runSessionRequest } from '@/modules/auth/auth.actions.ts';
import type { SessionContext } from '@/modules/auth/auth.types.ts';
import { requireElement } from '@/utils/helpers/dom.ts';
import { formatMoney } from '@/utils/helpers/money.ts';
import { toLocalMinute } from './postDate.ts';

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
  const unavailableTier = 'Один из уровней больше недоступен. Выберите другой уровень или «Для всех»';
  const schedule = requireElement<HTMLElement>(form, '[data-access-schedule]');
  const scheduleError = requireElement(schedule, '[data-schedule-error]');
  const stages = requireElement(schedule, '[data-access-stages]');
  const stageTemplate = requireElement<HTMLTemplateElement>(schedule, '[data-access-stage]');
  const stageDate = new Intl.DateTimeFormat('ru-RU', { day: 'numeric', month: 'long' });
  const stageTime = new Intl.DateTimeFormat('ru-RU', { hour: '2-digit', minute: '2-digit' });
  let savedTierId = initialTierId;
  let selectedTierId = initialTierId;
  let rejectedTierId: string | undefined;
  let rejectedBindings = new Map<Element, string>();
  let tiers: SubscriptionTier[] = [];
  let select: Select | undefined;
  const stageEditors = new Map<HTMLDetailsElement, {
    refresh: () => void;
    value: () => PostAccessStage;
    unfinished: () => boolean;
    reveal: () => void;
  }>();
  const addStage = requireElement<HTMLButtonElement>(schedule, '[data-stage-add]');
  const zone = requireElement(schedule, '[data-stage-zone]');
  const now = new Date();
  const year = now.getFullYear();
  const seasonal = new Date(year, 0, 1).getTimezoneOffset() !== new Date(year, 6, 1).getTimezoneOffset();
  const zoneName = new Intl.DateTimeFormat('ru-RU', { timeZoneName: seasonal ? 'shortGeneric' : 'shortOffset' })
    .formatToParts(now).find(({ type }) => type === 'timeZoneName')?.value.replace('GMT', 'UTC');
  zone.textContent = `Часовой пояс ${zoneName ?? stageDate.resolvedOptions().timeZone}`;
  const updateZone = () => { zone.toggleAttribute('hidden', !stageEditors.size); };
  const compareStages = (a: PostAccessStage, b: PostAccessStage) => Date.parse(a.starts_at) - Date.parse(b.starts_at);
  let savedSchedule = [...post?.access_schedule ?? []].sort(compareStages);
  const keepsBinding = (id: string, start: string) =>
    savedSchedule.some((stage) => stage.min_tier_id === id && stage.starts_at === start);
  const tierLabel = ({ name, status }: SubscriptionTier) => status === 'archived' ? `${name} · В архиве` : name;
  const isOpenTier = (tierId: string) => tiers.some(({ id, status }) => id === tierId && status === 'open');
  function changedBindings(): Map<Element, string> {
    const bindings = new Map<Element, string>();
    if (selectedTierId && selectedTierId !== savedTierId) {
      bindings.set(input, selectedTierId);
    }
    stageEditors.forEach((editor, row) => {
      const { starts_at, min_tier_id } = editor.value();
      if (min_tier_id && !keepsBinding(min_tier_id, starts_at)) {
        bindings.set(row, min_tier_id);
      }
    });
    return bindings;
  }
  function showScheduleError(message: string): void {
    scheduleError.textContent = message;
    schedule.scrollIntoView({ block: 'nearest' });
  }
  const currentSchedule = () => [...stageEditors.values()].map((stage) => stage.value()).sort(compareStages);
  const hasUnfinishedStages = () => [...stageEditors.values()].some((stage) => stage.unfinished());
  function scheduleChange(): PostAccessStage[] | undefined {
    const stages = currentSchedule();
    return stages.length === savedSchedule.length && stages.every((stage, index) =>
      stage.starts_at === savedSchedule[index].starts_at && stage.min_tier_id === savedSchedule[index].min_tier_id)
      ? undefined : stages;
  }
  function appendStage(initial?: PostAccessStage): void {
    const fragment = stageTemplate.content.cloneNode(true) as DocumentFragment;
    const row = requireElement<HTMLDetailsElement>(fragment, 'details');
    const date = requireElement<HTMLInputElement>(row, 'input[type="date"]');
    const clock = requireElement<HTMLInputElement>(row, 'input[type="time"]');
    const tierInput = requireElement<HTMLSelectElement>(row, 'select');
    const time = requireElement<HTMLTimeElement>(row, 'time');
    const title = requireElement(row, 'summary span');
    const dateError = requireElement(row, '[data-stage-date-error]');
    const originalTime = initial ? toLocalMinute(new Date(initial.starts_at)) : '';
    let start = initial?.starts_at ?? '';
    let tierId = initial?.min_tier_id ?? null;
    const keepsStageBinding = (id: string, date: string) => keepsBinding(id, date) && (
      (id === tierId && date === start) || (id === initial?.min_tier_id && date === initial.starts_at)
    );
    if (originalTime) {
      [date.value, clock.value] = originalTime.split('T');
    }
    function updateTitle(): void {
      time.dateTime = start;
      time.textContent = start ? `${stageDate.format(new Date(start))}, ${stageTime.format(new Date(start))}` : '';
      const tier = tiers.find(({ id }) => id === tierId);
      title.textContent = tier ? tierLabel(tier) : tierId ? savedLabel : publicLabel;
    }
    function refresh(): void {
      const selected = tierInput.selectedIndex < 0 ? tierId ?? '' : tierInput.value;
      const options = tiers.filter(({ id, status }) => status === 'open'
        || (id === tierId && keepsBinding(id, start))
        || (id === initial?.min_tier_id && keepsBinding(id, initial.starts_at)))
        .map((tier) => new Option(tierLabel(tier), tier.id));
      if (selected && !options.some(({ value }) => value === selected)) {
        const tier = tiers.find(({ id }) => id === selected);
        options.push(new Option(tier ? tierLabel(tier) : tierInput.selectedOptions[0]?.text ?? savedLabel, selected));
      }
      tierInput.replaceChildren(new Option(publicLabel, ''), ...options);
      tierInput.value = selected;
      updateTitle();
    }
    const enteredTime = () => `${date.value}T${clock.value}`;
    stageEditors.set(row, {
      refresh,
      value: () => ({ starts_at: start, min_tier_id: tierId }),
      unfinished: () => !start || enteredTime() !== toLocalMinute(new Date(start)) || (tierInput.value || null) !== tierId,
      reveal() {
        row.open = true;
        dateError.textContent ||= 'Нажмите «Готово», чтобы применить изменения этапа';
        row.scrollIntoView({ block: 'nearest' });
      },
    });
    refresh();
    row.addEventListener('input', () => { dateError.textContent = ''; });
    requireElement(row, '[data-stage-done]').addEventListener('click', () => {
      if (!date.reportValidity() || !clock.reportValidity()) {
        return;
      }
      const entered = enteredTime();
      const next = new Date(entered);
      if (!Number.isFinite(+next) || toLocalMinute(next) !== entered) {
        dateError.textContent = 'Этого времени нет в выбранную дату. Укажите другое время';
        return;
      }
      const nextStart = initial && entered === originalTime ? initial.starts_at : next.toISOString();
      const nextTierId = tierInput.value;
      if (nextTierId && !keepsStageBinding(nextTierId, nextStart)
        && !isOpenTier(nextTierId)) {
        dateError.textContent = 'Выберите открытый уровень или «Для всех»';
        return;
      }
      const others = [...stages.querySelectorAll('time')].filter((item) => item !== time);
      if (others.some((item) => Date.parse(item.dateTime) === Date.parse(nextStart))) {
        dateError.textContent = 'На это время уже есть этап. Укажите другое время';
        return;
      }
      start = nextStart;
      tierId = nextTierId || null;
      dateError.textContent = '';
      refresh();
      row.open = false;
      const following = others.find((item) => !item.dateTime || Date.parse(item.dateTime) > Date.parse(start));
      stages.insertBefore(row, following?.closest('details') ?? null);
      requireElement<HTMLElement>(row, 'summary').focus();
      form.dispatchEvent(new Event('input', { bubbles: true }));
    });
    requireElement(row, '[data-stage-delete]').addEventListener('click', () => {
      stageEditors.delete(row);
      row.remove();
      updateZone();
      addStage.focus();
      form.dispatchEvent(new Event('input', { bubbles: true }));
    });
    row.open = !initial;
    stages.append(fragment);
    updateZone();
    if (!initial) {
      date.focus();
      form.dispatchEvent(new Event('input', { bubbles: true }));
    }
  }

  savedSchedule.forEach(appendStage);
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
    scheduleChange,
    needsScheduleFix(endsAt: string | null) {
      if (endsAt && currentSchedule().some(({ starts_at }) => Date.parse(starts_at) >= Date.parse(endsAt))) {
        showScheduleError('Этапы должны начинаться до завершения публикации');
        return true;
      }
      if (rejectedBindings.size) {
        const bindings = changedBindings();
        const unchanged = [...rejectedBindings].every(([field, id]) => bindings.get(field) === id);
        if (unchanged || (bindings.size > 0 && input.disabled) || [...bindings.values()].some((id) => !isOpenTier(id))) {
          showScheduleError(unavailableTier);
          return true;
        }
      }
      scheduleError.textContent = '';
      return false;
    },
    rejectSchedule(refreshTiers: boolean) {
      if (refreshTiers) {
        rejectedBindings = changedBindings();
        showScheduleError(unavailableTier);
        void load();
      } else {
        showScheduleError('Проверьте даты и время этапов');
      }
    },
    hasScheduleChanges: () => hasUnfinishedStages() || scheduleChange() !== undefined,
    finishStageBeforeSaving() {
      const unfinished = [...stageEditors.values()].find((stage) => stage.unfinished());
      unfinished?.reveal();
      return !!unfinished;
    },
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
      rejectedBindings.clear();
      savedSchedule = currentSchedule();
      stageEditors.forEach((stage) => stage.refresh());
      if (selectedTierId !== savedTierId) {
        savedTierId = selectedTierId;
        renderOptions();
      }
    },
  };

  function renderOptions(): void {
    select?.destroy();
    list.replaceChildren();
    const options: { id: string | null; label: string; detail?: string }[] = [
      { id: null, label: publicLabel, detail: 'Без подписки' },
    ];
    for (const tier of tiers) {
      if (tier.id === savedTierId || (tier.status === 'open' && tier.id !== rejectedTierId)) {
        options.push({
          id: tier.id,
          label: tierLabel(tier),
          detail: `${formatMoney(tier.price_minor, tier.currency)} в месяц`,
        });
      }
    }
    if (savedTierId && !options.some(({ id }) => id === savedTierId)) {
      options.push({ id: savedTierId, label: savedLabel });
    }
    options.forEach(({ id, label, detail }, index) => {
      const option = document.createElement('li');
      option.id = `${input.id}-option-${index}`;
      option.className = 'select__option';
      option.setAttribute('role', 'option');
      option.setAttribute('aria-selected', String(id === selectedTierId));
      option.dataset.value = label;
      option.dataset.tierId = id ?? '';
      const name = document.createElement('span');
      name.className = 'post-access__option-name';
      name.textContent = label;
      option.append(name);
      if (detail) {
        const subtitle = document.createElement('span');
        subtitle.className = 'post-access__option-detail';
        subtitle.textContent = detail;
        option.append(' ', subtitle);
      }
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
      stageEditors.forEach((stage) => stage.refresh());
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
