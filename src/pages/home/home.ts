import { render } from '../../app/view.ts';
import { checkSession } from '../../modules/auth/auth.actions.ts';
import { authStore } from '../../modules/auth/auth.store.ts';
import { ApiError } from '../../modules/api/request.ts';
import { ROUTES } from '../../app/paths.ts';
import type { Navigate } from '../../app/paths.ts';

/** Возвращает текст проверки авторизации. */
export function renderHome(): string {
  return render('pages/home/home', { message: 'Проверка авторизации...' });
}

/**
 * Проверяет сессию и открывает профиль или страницу входа.
 * @param root
 * @param navigate
 */
export async function initHome(
  root: HTMLElement,
  navigate: Navigate,
): Promise<void> {
  const page = root.firstElementChild;
  try {
    const profile = await checkSession();
    if (!profile || root.firstElementChild !== page) {
      return;
    }
    if (authStore.getState().status === 'authenticated') {
      navigate(ROUTES.profile, { replace: true });
    }
  } catch (err) {
    if (root.firstElementChild !== page) {
      return;
    }
    if (err instanceof ApiError && err.status === 401) {
      navigate(ROUTES.login, { replace: true });
      return;
    }
    const message = err instanceof ApiError && err.status === 0
      ? 'Сервер недоступен. Проверьте интернет и попробуйте ещё раз'
      : 'Что-то пошло не так. Попробуйте позже';
    root.innerHTML = render('pages/home/home', { message, isError: true });
  }
}
