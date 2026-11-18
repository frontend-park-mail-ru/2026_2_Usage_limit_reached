import { POST_SORT_OPTIONS } from '@/components/postsList/postsList.constants.ts';
export { LIST_ERROR, LIST_LOADING_MESSAGE } from '@/components/postsList/postsList.constants.ts';
import type { ProfileTab, ProfileTabItem, SortOption } from './profile.types.ts';

export const PROFILE_TABS: ProfileTabItem[] = [
  { value: 'posts', label: 'Посты' },
  { value: 'drafts', label: 'Черновики' },
];

export const SORT_OPTIONS: Readonly<Record<ProfileTab, SortOption[]>> = {
  posts: POST_SORT_OPTIONS,
  drafts: [
    { value: 'new', label: 'Сначала новые' },
    { value: 'old', label: 'Сначала старые' },
  ],
};

export const LOADING_MESSAGE = 'Загрузка профиля...';
export const LOAD_ERROR = 'Не удалось загрузить профиль. Попробуйте позже';
export const DRAFT_DELETED_MESSAGE = 'Черновик удалён';
export const DRAFT_DELETE_ERROR = 'Повторите попытку позже';
export const POST_DELETED_MESSAGE = 'Пост удалён';
export const POST_DELETE_ERROR = 'Пост не удалён. Попробуйте позже';
