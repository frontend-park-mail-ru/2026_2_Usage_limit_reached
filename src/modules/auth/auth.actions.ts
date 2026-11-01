import * as authApi from '../api/auth.ts';
import { getProfile, getProfilePosts } from '../api/profile.ts';
import type { LoginData, SignupData } from '../api/auth.types.ts';
import { ApiError } from '../api/request.ts';
import { authDispatcher } from './auth.dispatcher.ts';
import type { SessionUser } from './auth.types.ts';
import './auth.store.ts';

let sessionVersion = 0;
let pendingChanges = 0;

/** Сохраняет состояние гостя после ответа backend об отсутствии сессии. */
export function expireSession(): void {
  sessionVersion += 1;
  authDispatcher.dispatch({ type: 'auth/guest' });
}

/**
 * Выполняет запрос с проверкой актуальности сессии.
 * Старые ответы и ошибки возвращают undefined, ошибки сети не меняют store.
 */
async function readSession<T>(request: () => Promise<T>, getUser?: (result: T) => SessionUser) {
  const version = sessionVersion;
  const canUpdate = pendingChanges === 0;
  try {
    const result = await request();
    if (!canUpdate || version !== sessionVersion) {
      return undefined;
    }
    if (getUser) {
      authDispatcher.dispatch({ type: 'auth/authenticated', user: getUser(result) });
    }
    return result;
  } catch (err) {
    if (!canUpdate || version !== sessionVersion) {
      return undefined;
    }
    if (err instanceof ApiError && err.status === 401) {
      expireSession();
    }
    throw err;
  }
}

/** Проверяет сессию через профиль и сохраняет пользователя в store. */
export function checkSession() {
  return readSession(getProfile, (profile) => profile.user);
}

/** Загружает посты, ответ от прежней сессии игнорируется. */
export function loadProfilePosts() {
  return readSession(getProfilePosts);
}

/**
 * После входа или регистрации сохраняет пользователя из ответа backend.
 * Пароль не попадает в store. Ответ старого запроса не меняет состояние.
 */
async function authenticate(request: () => ReturnType<typeof authApi.login>): Promise<void> {
  const version = ++sessionVersion;
  pendingChanges += 1;
  try {
    const user = await request();
    if (version === sessionVersion) {
      authDispatcher.dispatch({ type: 'auth/authenticated', user });
    }
  } finally {
    pendingChanges -= 1;
  }
}

/** Входит в аккаунт и передаёт ошибки запроса форме. */
export function login(data: LoginData): Promise<void> {
  return authenticate(() => authApi.login(data));
}

/** Регистрирует пользователя и сохраняет его в store. */
export function signup(data: SignupData): Promise<void> {
  return authenticate(() => authApi.signup(data));
}

/** После выхода сохраняет состояние гостя, в том числе при ответе 401. */
export async function logout(): Promise<void> {
  const version = ++sessionVersion;
  pendingChanges += 1;
  try {
    await authApi.logout();
    if (version === sessionVersion) {
      expireSession();
    }
  } catch (err) {
    if (version === sessionVersion && err instanceof ApiError && err.status === 401) {
      expireSession();
    }
    throw err;
  } finally {
    pendingChanges -= 1;
  }
}
