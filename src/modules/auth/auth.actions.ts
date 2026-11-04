import * as authApi from '../api/auth.ts';
import { getProfile, getProfilePosts } from '../api/profile.ts';
import type { LoginData, SignupData } from '../api/auth.types.ts';
import { ApiError } from '../api/request.ts';
import { authDispatcher } from './auth.dispatcher.ts';
import type { SessionContext, SessionUser } from './auth.types.ts';
import type { ProfilePostsQuery } from '../api/profile.types.ts';
import './auth.store.ts';

let sessionVersion = 0;
let confirmedSession: SessionContext | undefined;
let pendingChangeVersion: number | undefined;

/** Сохраняет состояние гостя после ответа backend об отсутствии сессии. */
export function expireSession(): void {
  sessionVersion += 1;
  confirmedSession = undefined;
  authDispatcher.dispatch({ type: 'auth/guest' });
}

/**
 * Выполняет запрос с проверкой актуальности сессии.
 * Старые ответы и ошибки возвращают undefined, ошибки сети не меняют store.
 */
async function readSession<T>(request: () => Promise<T>, getUser?: (result: T) => SessionUser & { id: string }) {
  const version = sessionVersion;
  const canUpdate = pendingChangeVersion === undefined;
  try {
    const result = await request();
    if (!canUpdate || version !== sessionVersion) {
      return undefined;
    }
    if (getUser) {
      const user = getUser(result);
      if (confirmedSession?.userId !== user.id) {
        if (confirmedSession) {
          sessionVersion += 1;
        }
        confirmedSession = Object.freeze({ userId: user.id });
      }
      authDispatcher.dispatch({ type: 'auth/authenticated', user });
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
  return readSession(async () => {
    const profile = await getProfile();
    if (typeof profile.user.id !== 'string' || !profile.user.id) {
      throw new ApiError(200, 'invalid profile user id');
    }
    return profile;
  }, (profile) => profile.user);
}

/** Возвращает контекст только после подтверждения собственного профиля. */
export function getSessionContext(): SessionContext | undefined {
  return pendingChangeVersion === undefined ? confirmedSession : undefined;
}

/** Проверяет, что подтверждённый аккаунт не сменился и выход не выполняется. */
export function isSessionCurrent(context: SessionContext): boolean {
  return context === getSessionContext();
}

/** Выполняет запрос аккаунта, устаревшие результаты и ошибки игнорируются. */
export async function runSessionRequest<T>(context: SessionContext, request: () => Promise<T>): Promise<T | undefined> {
  if (!isSessionCurrent(context)) {
    return undefined;
  }
  const version = sessionVersion;
  try {
    const result = await request();
    return version === sessionVersion && isSessionCurrent(context) ? result : undefined;
  } catch (error) {
    if (version !== sessionVersion || !isSessionCurrent(context)) {
      return undefined;
    }
    if (error instanceof ApiError && error.status === 401) {
      expireSession();
    }
    throw error;
  }
}

/** Загружает посты, ответ от прежней сессии игнорируется. */
export function loadProfilePosts(query?: ProfilePostsQuery) {
  const context = getSessionContext();
  return context ? runSessionRequest(context, () => getProfilePosts(query)) : Promise.resolve(undefined);
}

/**
 * После входа или регистрации сохраняет JSON без подтверждённого ID владельца.
 * Пароль не попадает в store. Ответ старого запроса не меняет состояние.
 */
async function authenticate(request: () => ReturnType<typeof authApi.login>): Promise<void> {
  const version = ++sessionVersion;
  pendingChangeVersion = version;
  try {
    const user = await request();
    if (version === sessionVersion) {
      confirmedSession = undefined;
      authDispatcher.dispatch({ type: 'auth/authenticated', user });
    }
  } finally {
    if (pendingChangeVersion === version) {
      pendingChangeVersion = undefined;
    }
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
  pendingChangeVersion = version;
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
    if (pendingChangeVersion === version) {
      pendingChangeVersion = undefined;
    }
  }
}
