/** Состояние и действие повторной загрузки задаёт текущая страница. */
export type SetRefreshNotice = (state: { pending: boolean } | null, retry?: () => void) => void;
