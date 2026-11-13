import type { EditorMode, EditorModeView } from './postEditor.types.ts';

export const EDITOR_MODES: Readonly<Record<EditorMode, EditorModeView>> = {
  create: { heading: 'Новый пост', backLabel: '← Мой профиль', saveLabel: 'Сохранить черновик', leaveTitle: 'Сохранить черновик?' },
  draft: { heading: 'Редактирование черновика', backLabel: '← Мой профиль', saveLabel: 'Сохранить черновик', leaveTitle: 'Сохранить черновик?' },
  published: { heading: 'Редактирование поста', backLabel: '← К посту', saveLabel: 'Сохранить изменения', leaveTitle: 'Сохранить изменения?' },
};

export const CLEAN_STATUS: Readonly<Record<EditorMode, string>> = {
  create: 'Новый черновик',
  draft: 'Черновик сохранён',
  published: '',
};

export const DIRTY_STATUS = 'Изменения ещё не сохранены';

export const LOADING_MESSAGE = 'Загрузка публикации...';
export const LOAD_ERROR = 'Не удалось открыть пост. Попробуйте позже';

export const DRAFT_SAVED_MESSAGE = 'Черновик сохранён';
export const PUBLISHED_MESSAGE = 'Пост опубликован';
export const CHANGES_SAVED_MESSAGE = 'Изменения сохранены';

export const PUBLISH_ERROR_TITLE = 'Не удалось опубликовать';
export const DRAFT_ERROR_TITLE = 'Не удалось сохранить черновик';
export const CHANGES_ERROR_TITLE = 'Не удалось сохранить изменения';

export const NETWORK_ERROR = 'Изменения остались в редакторе. Проверьте интернет и попробуйте ещё раз';
export const CONFLICT_ERROR = 'Пост изменили в другой вкладке. Обновите страницу, чтобы увидеть последнюю версию';
export const AUTHOR_ONLY_ERROR = 'Публиковать посты могут только авторы';
export const NOT_FOUND_ERROR = 'Публикация не найдена. Возможно, её удалили';
