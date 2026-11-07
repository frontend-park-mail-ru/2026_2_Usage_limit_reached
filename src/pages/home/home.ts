import homeTemplate from './home.hbs';
import { checkSession } from '../../modules/auth/auth.actions.ts';
import { ApiError } from '../../modules/api/request.ts';

/** Возвращает текст проверки авторизации. */
export function renderHome(): string {
  return homeTemplate({ message: 'Проверка авторизации...' });
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
    root.innerHTML = homeTemplate({ message, isError: true });
  }
}
