import { render } from '../../app/view.js';
import { getProfile } from '../../modules/api/profile.js';
import { ApiError } from '../../modules/api/request.js';

/**
 * Возвращает текст проверки авторизации.
 * @returns {string} HTML страницы.
 */
export function renderHome() {
  return render('pages/home/home', { message: 'Проверка авторизации...' });
}

/**
 * Проверяет сессию и открывает профиль или страницу входа.
 * @param {HTMLElement} root - Контейнер страницы.
 * @param {(path: string, options?: Object) => void} navigate - Функция перехода.
 * @returns {Promise<void>}
 */
export async function initHome(root, navigate) {
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
