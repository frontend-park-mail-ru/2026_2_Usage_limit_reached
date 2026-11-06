import type { ProfileTab, ProfileTabItem, SortOption } from './profile.types.ts';

export const PROFILE_TABS: ProfileTabItem[] = [
  { value: 'posts', label: 'Посты' },
  { value: 'drafts', label: 'Черновики' },
];

export const SORT_OPTIONS: Readonly<Record<ProfileTab, SortOption[]>> = {
  posts: [
    { value: 'new', label: 'Сначала новые' },
    { value: 'old', label: 'Сначала старые' },
    { value: 'popular', label: 'Сначала популярные' },
  ],
  drafts: [
    { value: 'new', label: 'Сначала новые' },
    { value: 'old', label: 'Сначала старые' },
  ],
};

export const DRAFT_MENU_ITEMS = [
  { action: 'edit', label: 'Редактировать' },
  { action: 'delete', label: 'Удалить черновик' },
];

export const LOADING_MESSAGE = 'Загрузка профиля...';
export const LIST_LOADING_MESSAGE = 'Загрузка публикаций...';
export const LOAD_ERROR = 'Что-то пошло не так. Попробуйте позже';
export const LIST_ERROR = 'Не удалось загрузить публикации. Попробуйте позже';
export const DRAFT_DELETED_MESSAGE = 'Черновик удалён';
export const DRAFT_DELETE_ERROR = 'Повторите попытку позже';
