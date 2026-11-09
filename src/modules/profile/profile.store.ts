import { profileDispatcher } from './profile.dispatcher.ts';
import type { SavedProfileNavigation } from './profile.types.ts';

let saved: SavedProfileNavigation | undefined;

profileDispatcher.register((action) => {
  saved = action.saved;
});

/** Возвращает результат сохранения для синхронного перехода к профилю. */
function getSavedNavigation(): SavedProfileNavigation | undefined {
  return saved;
}

export const profileStore = { getSavedNavigation };
