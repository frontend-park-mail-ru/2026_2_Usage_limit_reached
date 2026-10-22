import { render } from '../../app/view.js';
import { getProfile } from '../../modules/api/profile.js';
import { ApiError } from '../../modules/api/request.js';

export function renderHome(): string {
  return render('pages/home/home', { message: 'Проверка авторизации...' });
}

export async function initHome(
  root: HTMLElement,
  navigate: (path: string, options?: { replace?: boolean }) => void,
): Promise<void> {
  const page = root.firstElementChild;
  try {
    await getProfile();
    if (root.firstElementChild !== page) return;
    navigate('/profile', { replace: true });
  } catch (err) {
    if (root.firstElementChild !== page) return;
    if (err instanceof ApiError && err.status === 401) {
      navigate('/login', { replace: true });
      return;
    }
    const message = err instanceof ApiError && err.status === 0
      ? 'Сервер недоступен. Проверьте интернет и попробуйте ещё раз'
      : 'Что-то пошло не так. Попробуйте позже';
    root.innerHTML = render('pages/home/home', { message, isError: true });
  }
}
