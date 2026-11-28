import { ROUTES } from '@/app/paths.ts';
import type { AdminScreens } from './admin.types.ts';

export const ADMIN_ACCESS_CHECK_INTERVAL_MS = 30_000;

export const ADMIN_SCREENS: AdminScreens = {
  loading: { title: 'Проверяем доступ…' },
  authorized: { authorized: true },
  guest: {
    title: 'Войдите в аккаунт',
    message: 'После входа вы вернётесь в OnlineConf.',
    loginUrl: `${ROUTES.login}?${new URLSearchParams({ return_to: ROUTES.admin })}`,
  },
  forbidden: {
    title: 'Нет доступа',
    message: 'У вашего аккаунта нет прав на управление OnlineConf.',
  },
  error: {
    title: 'Не удалось проверить доступ',
    retry: true,
  },
};

export const ADMIN_LIST_TABS = [
  { value: 'configs', label: 'Конфигурации', selected: true },
  { value: 'flags', label: 'Feature flags', selected: false },
] as const;

export const ADMIN_LIST_MESSAGES = {
  loading: 'Загрузка…',
  noScopes: 'Нет доступных скоупов',
  scopesError: 'Не удалось загрузить скоупы',
  listError: 'Не удалось загрузить список',
} as const;

export const ADMIN_CONFIG_FORM_TEXT = {
  createTitle: 'Создание конфига',
  editTitle: 'Редактирование конфига',
  loading: 'Загрузка конфига…',
  invalidName: 'Введите имя конфига',
  invalidJson: 'Введите корректный JSON',
  loadError: 'Не удалось загрузить конфиг',
  saveError: 'Не удалось сохранить конфиг',
  alreadyExists: 'Конфиг с таким именем уже есть в этом скоупе',
} as const;
