import { render } from '../../app/view.js';
import { getProfile } from '../../modules/api/profile.js';
import { ApiError } from '../../modules/api/request.js';
import { ROUTES } from '../../app/paths.js';
import type { Navigate } from '../../app/paths.js';

export function renderHome(): string {
  return render('pages/home/home', { message: 'Проверка авторизации...' });
}

/**
 * @param root
 * @param navigate
 */
export async function initHome(
  root: HTMLElement,
  navigate: Navigate,
): Promise<void> {
  const page = root.firstElementChild;
  try {
    await getProfile();
    if (root.firstElementChild !== page) {
      return;
    }
    navigate(ROUTES.profile, { replace: true });
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
