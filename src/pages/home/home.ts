import homeTemplate from './home.hbs';
import { initProfile } from '../profile/profile.ts';
import type { Navigate } from '../../app/paths.ts';
import type { SetRefreshNotice } from '../../components/refreshNotice/refreshNotice.types.ts';
import type { RouteParams } from '../../app/router.types.ts';

/** Возвращает текст проверки авторизации. */
export function renderHome(): string {
  return homeTemplate({ message: 'Проверка авторизации...' });
}

/** Проверяет сессию, при недоступности сервера показывает сохранённый профиль. */
export function initHome(
  root: HTMLElement,
  navigate: Navigate,
  params: RouteParams,
  setRefreshNotice: SetRefreshNotice
): () => void {
  return initProfile(root, navigate, params, setRefreshNotice);
}
