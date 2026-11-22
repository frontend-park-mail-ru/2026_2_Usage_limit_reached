import { ROUTES } from '@/app/paths.ts';
import type { Navigate } from '@/app/paths.ts';
import { setAlert } from '@/components/alert/alert.ts';
import { ApiError } from '@/modules/api/request.ts';
import { createTier } from '@/modules/api/tiers.ts';
import { checkSession, getSessionContext, isSessionCurrent, runSessionMutation } from '@/modules/auth/auth.actions.ts';
import type { SessionContext } from '@/modules/auth/auth.types.ts';
import { bindValidation, setFieldError } from '@/modules/validation/bindForm.ts';
import { maxLength, minLength } from '@/modules/validation/rules.ts';
import type { FormValues, Schema } from '@/modules/validation/validation.types.ts';
import { requireElement } from '@/utils/helpers/dom.ts';
import { toMinor } from '@/utils/helpers/money.ts';
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

function bindNewTier(root: HTMLElement, context: SessionContext, navigate: Navigate, signal: AbortSignal): void {
  const form = requireElement<HTMLFormElement>(root, '.tier-form');
  const button = requireElement<HTMLButtonElement>(form, '[type="submit"]');
  const alert = requireElement<HTMLElement>(form, '[data-alert]');
  const check = requireElement<HTMLElement>(form, '[data-tier-check]');
  const status = requireElement<HTMLElement>(form, '.tier-form__status');
  const returnLinks = root.querySelectorAll<HTMLAnchorElement>('[data-tier-return]');
  const fields = form.querySelectorAll<HTMLInputElement | HTMLTextAreaElement>('input, textarea');
  let busy = false;

  const setBusy = (pending: boolean) => {
    busy = pending;
    button.disabled = pending;
    fields.forEach((field) => { field.readOnly = pending; });
    returnLinks.forEach((link) => { link.inert = pending; });
    status.textContent = pending ? 'Создаём уровень…' : '';
  };

  async function submit(values: FormValues): Promise<void> {
    if (busy || !isSessionCurrent(context)) {
      return;
    }
    setBusy(true);
    setAlert(alert, null);
    check.hidden = true;
    try {
      const tier = await runSessionMutation(context, () => createTier({
        name: values.name.trim(),
        description: values.description,
        price_minor: toMinor(Number(values.price)),
      }));
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
        if (error.isMutationTimeout) {
          setAlert(alert, 'Проверьте, появился ли уровень в списке, прежде чем отправлять форму снова', 'Не удалось подтвердить создание');
          check.hidden = false;
          return;
        }
      }
      setAlert(alert, error instanceof ApiError ? error.text : 'Попробуйте ещё раз', 'Не удалось создать уровень');
    } finally {
      setBusy(false);
    }
  }
  bindValidation(form, schema, (values) => { void submit(values); });
}

/** Проверяет права автора перед открытием формы. */
export function initNewTier(root: HTMLElement, navigate: Navigate): () => void {
  const lifecycle = new AbortController();
  const { signal } = lifecycle;
  async function load(): Promise<void> {
    root.innerHTML = renderNewTier();
    try {
      const profile = await checkSession();
      if (signal.aborted || !profile) {
        return;
      }
      const context = getSessionContext();
      if (!profile.author) {
        root.innerHTML = newTierTemplate({ message: 'Создавать уровни подписки могут авторы' });
        return;
      }
      if (context?.userId === profile.user.id) {
        root.innerHTML = newTierTemplate({ ready: true });
        bindNewTier(root, context, navigate, signal);
      }
    } catch {
      if (!signal.aborted) {
        root.innerHTML = newTierTemplate({ message: 'Не удалось открыть форму', retry: true });
        requireElement(root, '[data-tier-retry]').addEventListener('click', () => { void load(); }, { once: true, signal });
      }
    }
  }
  void load();
  return () => lifecycle.abort();
}
