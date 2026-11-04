import * as authApi from '../api/auth.ts';
import { getProfile, getProfilePosts } from '../api/profile.ts';
import type { LoginData, SignupData } from '../api/auth.types.ts';
import { ApiError } from '../api/request.ts';
import { authDispatcher } from './auth.dispatcher.ts';
import type { SessionContext } from './auth.types.ts';
import type { ProfilePostsQuery } from '../api/profile.types.ts';
import { captureOfflineToken, captureOfflineClearFallback, clearOfflineCopy, saveOfflineProfile, saveOfflinePosts } from '../offline/offline.storage.ts';
import type { OfflineClearToken } from '../offline/offline.types.ts';
import { DEFAULT_PROFILE_POSTS_QUERY } from '../api/profile.constants.ts';
import './auth.store.ts';

let sessionVersion = 0;
let confirmedSession: SessionContext | undefined;
let pendingChangeVersion: number | undefined;

/** Очищает копию актуальной сессии и сохраняет состояние гостя. */
export async function expireSession(expected: OfflineClearToken | undefined = confirmedSession?.offlineToken): Promise<boolean> {
  const version = sessionVersion;
  const cleared = await clearOfflineCopy(expected, () => version === sessionVersion);
  if (cleared === false || version !== sessionVersion) {
    return false;
  }
  sessionVersion += 1;
  confirmedSession = undefined;
  authDispatcher.dispatch({ type: 'auth/guest' });
  return true;
}

/** Проверяет профиль онлайн, сохраняет минимальную копию и подтверждает владельца. */
export async function checkSession() {
  const version = sessionVersion;
  const canUpdate = pendingChangeVersion === undefined;
  const isCurrent = () => canUpdate && version === sessionVersion && pendingChangeVersion === undefined;
  const fallback = confirmedSession?.offlineToken ?? captureOfflineClearFallback();
  const token = await captureOfflineToken();
  if (!isCurrent()) {
    return undefined;
  }
  try {
    const profile = await getProfile();
    if (!isCurrent()) {
      return undefined;
    }
    if (typeof profile.user.id !== 'string' || !profile.user.id) {
      throw new ApiError(200, 'invalid profile user id');
    }
    const saved = await saveOfflineProfile(token, profile, isCurrent);
    if (saved === null || !isCurrent()) {
      return undefined;
    }
    if (confirmedSession?.userId !== profile.user.id
      || confirmedSession?.offlineToken?.generation !== saved?.generation) {
      if (confirmedSession) {
        sessionVersion += 1;
      }
      confirmedSession = Object.freeze({ userId: profile.user.id, offlineToken: saved });
    }
    authDispatcher.dispatch({ type: 'auth/authenticated', user: profile.user });
    return profile;
  } catch (error) {
    if (!isCurrent()) {
      return undefined;
    }
    if (error instanceof ApiError && error.status === 401 && !await expireSession(token ?? fallback)) {
      return undefined;
    }
    throw error;
  }
}

/** Инвалидирует только память вкладки после изменения ревизии в другой вкладке. */
export async function handleOfflineSessionChange(): Promise<void> {
  const session = confirmedSession;
  const token = await captureOfflineToken();
  if (session !== confirmedSession || pendingChangeVersion !== undefined) {
    return;
  }
  if (session && token && session.offlineToken?.generation !== token.generation) {
    sessionVersion += 1;
    confirmedSession = undefined;
    authDispatcher.dispatch({ type: 'auth/unknown' });
  }
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
    if (version !== sessionVersion || !isSessionCurrent(context)) {
      return undefined;
    }
    const token = await captureOfflineToken();
    if (context.offlineToken && token && context.offlineToken.generation !== token.generation) {
      return undefined;
    }
    return version === sessionVersion && isSessionCurrent(context) ? result : undefined;
  } catch (error) {
    if (version !== sessionVersion || !isSessionCurrent(context)) {
      return undefined;
    }
    if (error instanceof ApiError && error.status === 401) {
      if (!await expireSession(context.offlineToken)) {
        return undefined;
      }
    }
    throw error;
  }
}

/** Загружает посты, ответ от прежней сессии игнорируется. */
export async function loadProfilePosts(query: ProfilePostsQuery = DEFAULT_PROFILE_POSTS_QUERY) {
  const context = getSessionContext();
  if (!context) {
    return undefined;
  }
  const parameters: ProfilePostsQuery = { sort: query.sort, limit: query.limit ?? DEFAULT_PROFILE_POSTS_QUERY.limit };
  if (query.cursor !== undefined) {
    parameters.cursor = query.cursor;
  }
  const posts = await runSessionRequest(context, () => getProfilePosts(parameters));
  if (!posts || !isSessionCurrent(context) || posts.items.some((item) => item.author.id !== context.userId)) {
    return undefined;
  }
  const saved = await saveOfflinePosts(context.offlineToken, posts, parameters, () => isSessionCurrent(context));
  return saved !== false && isSessionCurrent(context) ? posts : undefined;
}

/**
 * После входа или регистрации сохраняет JSON без подтверждённого ID владельца.
 * Пароль не попадает в store. Ответ старого запроса не меняет состояние.
 */
async function authenticate(request: () => ReturnType<typeof authApi.login>): Promise<void> {
  const version = ++sessionVersion;
  pendingChangeVersion = version;
  try {
    const fallback = confirmedSession?.offlineToken ?? captureOfflineClearFallback();
    const token = await captureOfflineToken();
    if (version !== sessionVersion) {
      return;
    }
    const user = await request();
    const cleared = version === sessionVersion
      ? await clearOfflineCopy(token ?? fallback, () => version === sessionVersion) : false;
    if (cleared !== false && version === sessionVersion) {
      confirmedSession = undefined;
      authDispatcher.dispatch({ type: 'auth/authenticated', user });
    }
  } finally {
    if (pendingChangeVersion === version) {
      pendingChangeVersion = undefined;
      void handleOfflineSessionChange();
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
  const fallback = confirmedSession?.offlineToken ?? captureOfflineClearFallback();
  const token = await captureOfflineToken();
  try {
    if (version !== sessionVersion) {
      return;
    }
    await authApi.logout();
    if (version === sessionVersion) {
      await expireSession(token ?? fallback);
    }
  } catch (err) {
    if (version === sessionVersion && err instanceof ApiError && err.status === 401) {
      await expireSession(token ?? fallback);
    }
    throw err;
  } finally {
    if (pendingChangeVersion === version) {
      pendingChangeVersion = undefined;
      void handleOfflineSessionChange();
    }
  }
}
