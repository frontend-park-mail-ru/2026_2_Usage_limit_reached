import { ROUTES } from '@/app/paths.ts';
import type { Navigate } from '@/app/paths.ts';
import type { RouteParams } from '@/app/router.types.ts';
import { setAlert } from '@/components/alert/alert.ts';
import { ConfirmDialog } from '@/components/confirmDialog/confirmDialog.ts';
import { ApiError } from '@/modules/api/request.ts';
import { createTier, getMyTiers, updateTier } from '@/modules/api/tiers.ts';
import type { SubscriptionTier } from '@/modules/api/tiers.ts';
import { checkSession, getSessionContext, isSessionCurrent, runSessionMutation, runSessionRequest } from '@/modules/auth/auth.actions.ts';
import type { SessionContext } from '@/modules/auth/auth.types.ts';
import { bindValidation, setFieldError } from '@/modules/validation/bindForm.ts';
import { maxLength, minLength } from '@/modules/validation/rules.ts';
import type { FormValues, Schema } from '@/modules/validation/validation.types.ts';
import { requireElement } from '@/utils/helpers/dom.ts';
import { toMinor } from '@/utils/helpers/money.ts';
import { MINOR_IN_MAJOR } from '@/utils/helpers/money.constants.ts';
import { getTierPriceRules } from './tierPrice.ts';
import newTierTemplate from './newTier.hbs';

const NAME_ERROR = 'Введите от 3 до 64 символов';
const DESCRIPTION_ERROR = 'Введите не больше 1000 символов';
const PRICE_ERROR = 'Введите целое число от 1 до 999 999 ₽';
const schema: Schema = {
  name: [(value) => minLength(3, NAME_ERROR)(value.trim()) ?? maxLength(64, NAME_ERROR)(value.trim())],
  description: [maxLength(1000, DESCRIPTION_ERROR)],
  price: [(value) => /^\d+$/.test(value.trim()) && Number(value) >= 1 && Number(value) <= 999_999 ? null : PRICE_ERROR],
};

const invalidFields = new Map([
  ['invalid_name', ['name', NAME_ERROR]],
  ['invalid_description', ['description', DESCRIPTION_ERROR]],
  ['invalid_price', ['price', PRICE_ERROR]],
]);

/** Возвращает страницу создания уровня в состоянии загрузки. */
export function renderNewTier(): string {
  return newTierTemplate({ message: 'Загружаем форму…' });
}

/** Возвращает страницу редактирования в состоянии загрузки. */
export function renderEditTier(): string {
  return newTierTemplate({ editing: true, message: 'Загружаем уровень…' });
}

const ARCHIVED = 'Уровень уже в архиве';
const MISSING = 'Уровень не найден';

type EditState = { tier: SubscriptionTier; items: SubscriptionTier[] };

function bindTierForm(root: HTMLElement, context: SessionContext, navigate: Navigate, signal: AbortSignal, edit?: EditState): void {
  const form = requireElement<HTMLFormElement>(root, '.tier-form');
  const button = requireElement<HTMLButtonElement>(form, '[type="submit"]');
  const alert = requireElement<HTMLElement>(form, '[data-alert]');
  const check = requireElement<HTMLElement>(form, '[data-tier-check]');
  const status = requireElement<HTMLElement>(form, '.tier-form__status');
  const returnLinks = root.querySelectorAll<HTMLAnchorElement>('[data-tier-return]');
  const fields = form.querySelectorAll<HTMLInputElement | HTMLTextAreaElement>('input, textarea');
  const price = requireElement<HTMLInputElement>(form, '#tier-price');
  const description = requireElement<HTMLTextAreaElement>(form, '#tier-description');
  description.value = edit?.tier.description ?? '';
  const originalDescription = description.value;
  const priceHint = requireElement<HTMLElement>(form, '#tier-price-hint');
  const errorTitle = edit ? 'Не удалось сохранить изменения' : 'Не удалось создать уровень';
  const archiveButton = root.querySelector<HTMLButtonElement>('[data-archive-tier]');
  const archiveDialog = root.querySelector<HTMLDialogElement>('#tier-archive-dialog');
  let busy = false;
  let stopped = false;
  let refreshRequired = false;
  let currentTier = edit?.tier;
  let priceRules = edit && getTierPriceRules(edit.tier, edit.items);

  const setBusy = (pending: boolean, message = edit ? 'Сохраняем изменения…' : 'Создаём уровень…') => {
    busy = pending;
    button.disabled = pending || stopped;
    if (archiveButton) {
      archiveButton.disabled = pending || stopped;
    }
    fields.forEach((field) => { field.readOnly = pending; });
    price.readOnly ||= !!priceRules?.fixed;
    returnLinks.forEach((link) => { link.inert = pending; });
    status.textContent = pending ? message : '';
  };

  const stopEditing = (message: string) => {
    stopped = true;
    setAlert(alert, message, errorTitle);
  };

  async function refreshPrice(id: string): Promise<boolean> {
    refreshRequired = true;
    try {
      const page = await runSessionRequest(context, () => getMyTiers(signal));
      if (!page || signal.aborted) {
        return false;
      }
      refreshRequired = false;
      const latest = page.items.find((tier) => tier.id === id);
      if (!latest || latest.status === 'archived') {
        stopEditing(latest ? ARCHIVED : MISSING);
        return false;
      }
      currentTier = latest;
      priceRules = getTierPriceRules(latest, page.items);
      priceHint.hidden = !priceRules.fixed;
      if (priceRules.fixed) {
        price.value = String(latest.price_minor / MINOR_IN_MAJOR);
      }
      return true;
    } catch {
      if (!signal.aborted && isSessionCurrent(context)) {
        setAlert(alert, 'Не удалось обновить список уровней. Попробуйте сохранить ещё раз', errorTitle);
      }
      return false;
    }
  }

  async function submit(values: FormValues): Promise<void> {
    if (busy || stopped || archiveDialog?.open || !isSessionCurrent(context)) {
      return;
    }
    setBusy(true);
    setAlert(alert, null);
    check.hidden = true;
    try {
      const input = {
        name: values.name.trim(),
        description: values.description,
        price_minor: toMinor(Number(values.price)),
      };
      if (currentTier && (refreshRequired || (!priceRules?.fixed && priceRules?.validate(input.price_minor)))) {
        if (!await refreshPrice(currentTier.id) || priceRules?.fixed) {
          return;
        }
      }
      if (priceRules && !priceRules.fixed) {
        const priceError = priceRules.validate(input.price_minor);
        if (priceError) {
          setFieldError(form, 'price', priceError);
          price.focus();
          return;
        }
      }
      const changes = edit && currentTier ? {
        ...(input.name !== edit.tier.name ? { name: input.name } : {}),
        ...(input.description !== originalDescription ? { description: input.description } : {}),
        ...(!priceRules?.fixed && input.price_minor !== currentTier.price_minor ? { price_minor: input.price_minor } : {}),
      } : null;
      if (changes && !Object.keys(changes).length) {
        navigate(ROUTES.settingsTiers, { replace: true });
        return;
      }
      const tier = await runSessionMutation(context,
        () => currentTier && changes ? updateTier(currentTier.id, changes) : createTier(input));
      if (!signal.aborted && tier) {
        navigate(ROUTES.settingsTiers, { replace: true });
      }
    } catch (error) {
      if (signal.aborted) {
        return;
      }
      if (error instanceof ApiError) {
        if (error.isMutationResponseTimeout) {
          navigate(ROUTES.settingsTiers, { replace: true });
          return;
        }
        const fieldError = error.status === 400 ? invalidFields.get(error.code) : undefined;
        if (fieldError) {
          setFieldError(form, fieldError[0], fieldError[1]);
          return;
        }
        if (error.status === 409 && error.code === 'tier_price_taken') {
          setFieldError(form, 'price', 'У открытого уровня уже есть такая цена');
          return;
        }
        if (currentTier && error.status === 409 && error.code === 'tier_price_out_of_order') {
          if (await refreshPrice(currentTier.id) && priceRules && !priceRules.fixed) {
            setFieldError(form, 'price', priceRules.validate(toMinor(Number(price.value)))
              ?? 'Порядок уровней изменился. Проверьте цену');
          }
          return;
        }
        if (currentTier && error.status === 409 && error.code === 'tier_archived') {
          stopEditing(ARCHIVED);
          return;
        }
        if (currentTier && error.status === 404 && error.code === 'tier_not_found') {
          stopEditing(MISSING);
          return;
        }
        if (error.isMutationTimeout) {
          setAlert(alert, edit ? 'Проверьте, сохранились ли изменения, прежде чем отправлять форму снова'
            : 'Проверьте, появился ли уровень в списке, прежде чем отправлять форму снова',
          edit ? 'Не удалось подтвердить сохранение' : 'Не удалось подтвердить создание');
          check.hidden = false;
          return;
        }
      }
      setAlert(alert, error instanceof ApiError ? error.text : 'Попробуйте ещё раз', errorTitle);
    } finally {
      setBusy(false);
    }
  }
  if (edit) {
    priceHint.hidden = !priceRules?.fixed;
    price.readOnly = !!priceRules?.fixed;
  }
  if (archiveButton && archiveDialog) {
    const dialog = new ConfirmDialog(archiveDialog, true);
    const title = requireElement(archiveDialog, '.modal__title');
    const errorHeading = requireElement(archiveDialog, '[data-alert-title]');
    const checkArchive = requireElement<HTMLElement>(archiveDialog, '[data-confirm-check]');
    const archiveStatus = document.createElement('p');
    archiveStatus.className = 'tier-form__status';
    archiveStatus.setAttribute('role', 'status');
    checkArchive.after(archiveStatus);
    archiveButton.addEventListener('click', () => {
      if (busy || stopped || !currentTier || !isSessionCurrent(context)) {
        return;
      }
      const { id, name } = currentTier;
      title.textContent = `Архивировать уровень «${name}»?`;
      checkArchive.hidden = true;
      dialog.open(null, async () => {
        if (busy || !isSessionCurrent(context)) {
          return null;
        }
        setBusy(true, 'Архивируем уровень…');
        archiveStatus.textContent = 'Архивируем уровень…';
        checkArchive.hidden = true;
        try {
          const result = await runSessionMutation(context, () => updateTier(id, { status: 'archived' }));
          if (result && !signal.aborted) {
            navigate(ROUTES.settingsTiers, { replace: true });
          }
          return null;
        } catch (error) {
          if (signal.aborted) {
            return null;
          }
          errorHeading.textContent = 'Не удалось архивировать уровень';
          if (error instanceof ApiError) {
            if (error.isMutationResponseTimeout) {
              navigate(ROUTES.settingsTiers, { replace: true });
              return null;
            }
            if (error.isMutationTimeout) {
              errorHeading.textContent = 'Не удалось подтвердить архивацию';
              checkArchive.hidden = false;
              return 'Проверьте, есть ли у уровня пометка «В архиве»';
            }
            return error.code === 'tier_not_found' ? MISSING : error.text;
          }
          return 'Попробуйте ещё раз';
        } finally {
          archiveStatus.textContent = '';
          setBusy(false);
        }
      });
    }, { signal });
    signal.addEventListener('abort', () => dialog.destroy(), { once: true });
  }
  bindValidation(form, schema, (values) => { void submit(values); });
}

function initTierForm(root: HTMLElement, navigate: Navigate, tierId?: string): () => void {
  const lifecycle = new AbortController();
  const { signal } = lifecycle;
  async function load(): Promise<void> {
    root.innerHTML = tierId ? renderEditTier() : renderNewTier();
    try {
      const profile = await checkSession();
      if (signal.aborted || !profile) {
        return;
      }
      const context = getSessionContext();
      if (!profile.author) {
        root.innerHTML = newTierTemplate({ editing: !!tierId,
          message: tierId ? 'Редактировать уровни подписки могут авторы' : 'Создавать уровни подписки могут авторы' });
        return;
      }
      if (context?.userId === profile.user.id) {
        let edit: EditState | undefined;
        if (tierId) {
          const page = await runSessionRequest(context, () => getMyTiers(signal));
          if (signal.aborted || !page) {
            return;
          }
          const tier = page.items.find((item) => item.id === tierId);
          if (!tier || tier.status === 'archived') {
            root.innerHTML = newTierTemplate({ editing: true, message: tier ? ARCHIVED : MISSING });
            return;
          }
          edit = { tier, items: page.items };
        }
        root.innerHTML = newTierTemplate({ ready: true, editing: !!edit, tier: edit?.tier,
          price: edit && edit.tier.price_minor / MINOR_IN_MAJOR });
        bindTierForm(root, context, navigate, signal, edit);
      }
    } catch {
      if (!signal.aborted) {
        root.innerHTML = newTierTemplate({ editing: !!tierId, message: 'Не удалось открыть форму', retry: true });
        requireElement(root, '[data-tier-retry]').addEventListener('click', () => { void load(); }, { once: true, signal });
      }
    }
  }
  void load();
  return () => lifecycle.abort();
}

/** Проверяет права автора перед открытием формы создания. */
export function initNewTier(root: HTMLElement, navigate: Navigate): () => void {
  return initTierForm(root, navigate);
}

/** Загружает редактируемый уровень по идентификатору. */
export function initEditTier(root: HTMLElement, navigate: Navigate, params: RouteParams): () => void {
  return initTierForm(root, navigate, params.id);
}
