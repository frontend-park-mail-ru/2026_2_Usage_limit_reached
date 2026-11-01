import { render } from '../../app/view.ts';
import { checkSession } from '../../modules/auth/auth.actions.ts';
import { ApiError } from '../../modules/api/request.ts';

/** Возвращает текст проверки авторизации. */
export function renderHome(): string {
  return render('pages/home/home', { message: 'Проверка авторизации...' });
}

/**
 * Проверяет сессию, переход по её состоянию выполняет роутер.
 * @param root
 */
export async function initHome(root: HTMLElement): Promise<void> {
  const page = root.firstElementChild;
  try {
    await checkSession();
  } catch (err) {
    if (root.firstElementChild !== page) {
      return;
    }
    if (err instanceof ApiError && err.status === 401) {
      return;
    }
    const message = err instanceof ApiError && err.status === 0
      ? 'Сервер недоступен. Проверьте интернет и попробуйте ещё раз'
      : 'Что-то пошло не так. Попробуйте позже';
    root.innerHTML = render('pages/home/home', { message, isError: true });
  }
}
