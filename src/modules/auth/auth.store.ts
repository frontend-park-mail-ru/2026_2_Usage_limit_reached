import { authDispatcher } from './auth.dispatcher.ts';
import type { AuthState } from './auth.types.ts';

let state: AuthState = Object.freeze({ status: 'unknown', user: null });
const listeners = new Set<() => void>();

authDispatcher.register((action) => {
  if (action.type === 'auth/authenticated') {
    state = Object.freeze({
      status: 'authenticated',
      user: Object.freeze({ username: action.user.username, nickname: action.user.nickname }),
    });
  } else {
    state = Object.freeze({ status: 'guest', user: null });
  }
  for (const listener of listeners) {
    listener();
  }
});

/** Возвращает текущее состояние, которое нельзя изменить напрямую. */
function getState(): AuthState {
  return state;
}

/** Подписывает на изменения store и возвращает функцию отписки. */
function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export const authStore = { getState, subscribe };
