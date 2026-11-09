import type { PostsSort } from '@/modules/api/posts.types.ts';

export const POST_SORT_OPTIONS: { value: PostsSort; label: string }[] = [
    { value: 'new', label: 'Сначала новые' },
    { value: 'old', label: 'Сначала старые' },
    { value: 'popular', label: 'Сначала популярные' },
  ];

export const LIST_LOADING_MESSAGE = 'Загрузка публикаций...';

export const LIST_ERROR = 'Не удалось загрузить публикации. Попробуйте позже';
