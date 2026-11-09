import becomeAuthorTemplate from './becomeAuthor.hbs';
import { requireElement } from '@/utils/helpers/dom.ts';
import { checkSession, getSessionContext, isSessionCurrent } from '@/modules/auth/auth.actions.ts';
import { authStore } from '@/modules/auth/auth.store.ts';
import { becomeAuthor } from '@/modules/profile/profile.actions.ts';
import type { AuthorCreationInput, Profile } from '@/modules/api/profile.types.ts';
import { ApiError } from '@/modules/api/request.ts';
import { becomeAuthorSchema } from '@/modules/validation/schemas.ts';
import { validate } from '@/modules/validation/validate.ts';
import { setFieldError } from '@/modules/validation/bindForm.ts';
import type { FormValues } from '@/modules/validation/validation.types.ts';
import { AVATAR_PLACEHOLDER } from '@/modules/profile/profile.constants.ts';
import { PROFILE_CATEGORIES } from '@/pages/settings/settings.constants.ts';
import { Select } from '@/components/select/select.ts';
import { Modal } from '@/components/modal/modal.ts';
import { showToast } from '@/components/toast/toast.ts';
import { ROUTES } from '@/app/paths.ts';
import type { Navigate } from '@/app/paths.ts';
import type { RouteParams } from '@/app/router.types.ts';
import type { SetRefreshNotice } from '@/components/refreshNotice/refreshNotice.types.ts';
import type { SessionContext } from '@/modules/auth/auth.types.ts';
import { BIO_MAX } from '@/modules/validation/schemas.constants.ts';

const LOAD_ERROR = 'Не удалось загрузить профиль. Проверьте соединение и попробуйте ещё раз';
const AUTHOR_CREATED_MESSAGE = 'Вы стали автором';

/** Возвращает каркас страницы. */
export function renderBecomeAuthor(): string {
  return becomeAuthorTemplate({ message: 'Загрузка профиля...' });
}

function renderLoadError(root: HTMLElement): void {
  root.innerHTML = becomeAuthorTemplate({ message: LOAD_ERROR, canRetry: true });
}

function showRequestError(root: HTMLElement, message: string, needsCheck = false): void {
  const alert = requireElement<HTMLElement>(root, '[data-author-error]');
  requireElement<HTMLElement>(alert, '[data-author-error-text]').textContent = message;
  requireElement<HTMLButtonElement>(alert, '[data-check-author]').hidden = !needsCheck;
  alert.hidden = false;
}

function getRequestError(error: ApiError): string {
  if (error.isCsrfError || error.isMutationTimeout) {
    return error.text;
  }
  if (error.status === 400) {
    return 'Проверьте описание и попробуйте ещё раз';
  }
  if (error.status === 403) {
    return error.text;
  }
  if (error.status === 404) {
    return 'Профиль пользователя не найден. Обновите страницу и попробуйте ещё раз';
  }
  if (error.status === 500) {
    return 'Не удалось создать профиль автора. Попробуйте позже';
  }
  if (error.status === 0) {
    return 'Не удалось связаться с сервером. Проверьте соединение и попробуйте ещё раз';
  }
  return error.text;
}

/** Подключает форму и шаг оплаты после проверки сессии. */
function bindBecomeAuthor(root: HTMLElement, navigate: Navigate, profile: Profile): () => void {
  const selectInput = requireElement<HTMLInputElement>(root, '#become-author-category');
  const selectRoot = selectInput.closest<HTMLElement>('.select');
  const select = selectRoot ? new Select(selectRoot) : undefined;
  const dialog = requireElement<HTMLDialogElement>(root, '[aria-labelledby="author-payment-title"]');
  const modal = new Modal(dialog);
  const form = requireElement<HTMLFormElement>(root, '[data-author-form]');
  const bioInput = requireElement<HTMLTextAreaElement>(form, '[name="bio"]');
  const bioCount = requireElement<HTMLElement>(form, '[data-bio-count]');
  const profileStep = requireElement<HTMLElement>(root, '[data-author-step="profile"]');
  const paymentStep = requireElement<HTMLElement>(root, '[data-author-step="payment"]');
  const finishButtons = [...root.querySelectorAll<HTMLButtonElement>('[data-author-finish]')];
  let context: SessionContext | undefined = getSessionContext();
  let active = true;
  let submitting = false;
  let requestPending = false;
  let checking = false;
  let requiresStatusCheck = false;
  let requiresSessionCheck = false;
  let requestVersion = 0;
  let postVersion = 0;
  let completedPostVersion = 0;

  if (!context || context.userId !== profile.user.id) {
    navigate(ROUTES.profile, { replace: true, force: true });
    return () => {
      active = false;
      modal.destroy();
      select?.destroy();
    };
  }

  const setStep = (step: 'profile' | 'payment') => {
    profileStep.hidden = step !== 'profile';
    paymentStep.hidden = step !== 'payment';
    profileStep.setAttribute('aria-hidden', String(step !== 'profile'));
    paymentStep.setAttribute('aria-hidden', String(step !== 'payment'));
    if (step === 'profile') {
      bioInput.focus();
    } else {
      requireElement<HTMLButtonElement>(paymentStep, '[data-payment-open]').focus();
    }
  };

  const setBusy = (busy: boolean) => {
    submitting = busy;
    const locked = busy || requestPending;
    finishButtons.forEach((button) => { button.disabled = locked || requiresStatusCheck || requiresSessionCheck; });
    requireElement<HTMLButtonElement>(form, '[data-author-continue]').disabled = locked || requiresSessionCheck;
    requireElement<HTMLButtonElement>(root, '[data-payment-open]').disabled = locked || requiresSessionCheck;
    requireElement<HTMLButtonElement>(root, '[data-author-back]').disabled = locked || requiresSessionCheck;
  };

  const clearRequestError = () => {
    const alert = requireElement<HTMLElement>(root, '[data-author-error]');
    alert.hidden = true;
    requireElement<HTMLButtonElement>(alert, '[data-check-author]').hidden = true;
  };

  const finishSuccessfully = () => {
    if (!active) {
      return;
    }
    showToast(AUTHOR_CREATED_MESSAGE);
    navigate(ROUTES.profile, { replace: true, force: true });
  };

  const checkAuthorStatus = async () => {
    if (!active || checking) {
      return;
    }
    const completedPostAtStart = completedPostVersion;
    checking = true;
    const checkButton = requireElement<HTMLButtonElement>(root, '[data-check-author]');
    checkButton.disabled = true;
    checkButton.textContent = 'Проверяем…';
    try {
      const refreshed = await checkSession();
      if (!active) {
        return;
      }
      if (!refreshed) {
        if (completedPostAtStart !== completedPostVersion && requiresStatusCheck) {
          showRequestError(root, 'Эта проверка началась до завершения запроса. Проверьте профиль ещё раз перед повтором.', true);
        } else {
          showRequestError(root, 'Не удалось подтвердить сессию. Проверьте соединение и попробуйте ещё раз', true);
        }
        return;
      }
      if (refreshed.user.id !== profile.user.id) {
        navigate(ROUTES.profile, { replace: true, force: true });
        return;
      }
      if (refreshed.author) {
        finishSuccessfully();
        return;
      }
      const nextContext = getSessionContext();
      if (!nextContext || nextContext.userId !== profile.user.id) {
        return;
      }
      context = nextContext;
      const wasSessionCheck = requiresSessionCheck;
      requiresSessionCheck = false;
      const staleCheck = completedPostAtStart !== completedPostVersion && requiresStatusCheck;
      requiresStatusCheck = requestPending || staleCheck;
      if (requestPending) {
        showRequestError(root, 'Запрос ещё выполняется. После его завершения проверьте профиль перед повтором.');
      } else if (staleCheck) {
        showRequestError(root, 'Эта проверка началась до завершения запроса. Проверьте профиль ещё раз перед повтором.', true);
      } else if (wasSessionCheck) {
        clearRequestError();
      } else {
        showRequestError(root, 'Профиль пока не стал авторским. Если статус не обновился, можно повторить попытку.');
      }
      setBusy(false);
    } catch {
      if (active) {
        showRequestError(root, 'Не удалось проверить профиль. Проверьте соединение и повторите проверку', true);
      }
    } finally {
      checking = false;
      if (active) {
        checkButton.disabled = false;
        checkButton.textContent = requiresSessionCheck ? 'Проверить сессию' : 'Проверить профиль';
      }
    }
  };

  const handleSessionChange = () => {
    if (!active || authStore.getState().status !== 'unknown') {
      return;
    }
    requestVersion += 1;
    context = undefined;
    requiresSessionCheck = true;
    requiresStatusCheck = requestPending;
    modal.close();
    setBusy(false);
    const checkButton = requireElement<HTMLButtonElement>(root, '[data-check-author]');
    checkButton.textContent = 'Проверить сессию';
    showRequestError(root, requestPending
      ? 'Сессия изменилась во время отправки. Проверьте её, чтобы продолжить.'
      : 'Сессия изменилась. Проверьте её, чтобы продолжить.', true);
  };
  const unsubscribeAuth = authStore.subscribe(handleSessionChange);

  const submitCreation = async () => {
    if (!active || submitting || requestPending || requiresStatusCheck) {
      return;
    }
    if (!context || !isSessionCurrent(context)) {
      handleSessionChange();
      return;
    }
    const description = bioInput.value;
    const category = selectInput.value;
    const values: FormValues = { bio: description, category };
    const validation = validate(values, becomeAuthorSchema);
    setFieldError(form, 'bio', validation.errors.bio ?? null);
    if (!validation.isValid) {
      setStep('profile');
      bioInput.focus();
      return;
    }

    const input: AuthorCreationInput = { bio: description.trim() };
    if (category) {
      input.category = category;
    }
    clearRequestError();
    requestPending = true;
    const submittedPostVersion = ++postVersion;
    setBusy(true);
    modal.close();
    const submittedContext = context;
    const submittedVersion = requestVersion;
    try {
      const result = await becomeAuthor(input, submittedContext);
      if (!active || submittedVersion !== requestVersion) {
        return;
      }
      if (!result) {
        requiresStatusCheck = true;
        setBusy(false);
        finishButtons.forEach((button) => { button.disabled = true; });
        showRequestError(root, 'Сессия изменилась. Проверьте профиль перед повтором.', true);
        return;
      }
      if (result.author) {
        finishSuccessfully();
      } else {
        requiresStatusCheck = true;
        setBusy(false);
        finishButtons.forEach((button) => { button.disabled = true; });
        showRequestError(root, 'Сервер не подтвердил профиль автора. Проверьте результат перед повтором.', true);
      }
    } catch (error) {
      if (!active || submittedVersion !== requestVersion) {
        return;
      }
      if (!isSessionCurrent(submittedContext) && !(error instanceof ApiError && error.isMutationResponseTimeout)) {
        if (active) {
          handleSessionChange();
        }
        return;
      }
      const needsCheck = error instanceof ApiError && error.isMutationTimeout;
      requiresStatusCheck = needsCheck;
      setBusy(false);
      if (error instanceof ApiError) {
        showRequestError(root, getRequestError(error), needsCheck);
      } else {
        showRequestError(root, 'Не удалось создать профиль автора. Попробуйте позже');
      }
    } finally {
      requestPending = false;
      completedPostVersion = submittedPostVersion;
      if (active) {
        if (submittedVersion !== requestVersion) {
          requiresStatusCheck = true;
          showRequestError(root, 'Запрос мог завершиться после смены сессии. Проверьте профиль перед повтором.', true);
          const checkButton = requireElement<HTMLButtonElement>(root, '[data-check-author]');
          checkButton.textContent = requiresSessionCheck ? 'Проверить сессию' : 'Проверить профиль';
        }
        setBusy(false);
      }
    }
  };

  form.addEventListener('submit', (event) => {
    event.preventDefault();
    if (submitting) {
      return;
    }
    const validation = validate({ bio: bioInput.value, category: selectInput.value }, becomeAuthorSchema);
    setFieldError(form, 'bio', validation.errors.bio ?? null);
    if (!validation.isValid) {
      bioInput.focus();
      return;
    }
    setStep('payment');
  });

  bioInput.addEventListener('input', () => {
    const characterCount = [...bioInput.value].length;
    const limitMessage = `Сократите описание до ${BIO_MAX} символов`;
    bioCount.textContent = `${characterCount} / ${BIO_MAX}`;
    bioCount.classList.toggle('become-author__bio-count_over-limit', characterCount > BIO_MAX);
    const currentError = form.querySelector<HTMLElement>('[data-error-for="bio"]')?.textContent;
    if (characterCount > BIO_MAX) {
      setFieldError(form, 'bio', limitMessage);
    } else if (currentError === limitMessage) {
      setFieldError(form, 'bio', null);
    }
  });

  requireElement<HTMLButtonElement>(root, '[data-author-back]').addEventListener('click', () => setStep('profile'));
  requireElement<HTMLButtonElement>(root, '[data-payment-open]').addEventListener('click', () => modal.open());
  finishButtons.forEach((button) => button.addEventListener('click', () => { void submitCreation(); }));
  requireElement<HTMLButtonElement>(root, '[data-check-author]').addEventListener('click', () => { void checkAuthorStatus(); });

  return () => {
    active = false;
    unsubscribeAuth();
    modal.destroy();
    select?.destroy();
  };
}

/** Проверяет сессию и не показывает сценарий повторно действующему автору. */
export function initBecomeAuthor(
  root: HTMLElement,
  navigate: Navigate,
  _params: RouteParams,
  _setRefreshNotice: SetRefreshNotice
): () => void {
  void _params;
  void _setRefreshNotice;
  let active = true;
  let dispose: (() => void) | undefined;
  let requestVersion = 0;
  let pageReady = false;
  const load = async () => {
    const version = ++requestVersion;
    try {
      const profile = await checkSession();
      if (!active || version !== requestVersion) {
        return;
      }
      if (!profile) {
        if (authStore.getState().status === 'unknown') {
          renderLoadError(root);
          root.querySelector('[data-retry-profile]')?.addEventListener('click', () => { void load(); });
        }
        return;
      }
      if (profile.author) {
        navigate(ROUTES.profile, { replace: true, force: true });
        return;
      }
      const categories = PROFILE_CATEGORIES.map((value) => ({ value, selected: false }));
      root.innerHTML = becomeAuthorTemplate({
        nickname: profile.user.nickname,
        username: profile.user.username,
        avatarUrl: profile.user.avatar_url ?? AVATAR_PLACEHOLDER,
        categories,
      });
      dispose = bindBecomeAuthor(root, navigate, profile);
      pageReady = true;
    } catch {
      if (!active || version !== requestVersion) {
        return;
      }
      renderLoadError(root);
      root.querySelector('[data-retry-profile]')?.addEventListener('click', () => { void load(); });
    }
  };
  const unsubscribeAuth = authStore.subscribe(() => {
    if (active && !pageReady && authStore.getState().status === 'unknown') {
      void load();
    }
  });
  void load();
  return () => {
    active = false;
    requestVersion += 1;
    unsubscribeAuth();
    dispose?.();
  };
}
