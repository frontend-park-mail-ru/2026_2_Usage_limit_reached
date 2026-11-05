import type { Profile, ProfilePosts, ProfilePostsQuery } from '../api/profile.types.ts';
import { DEFAULT_PROFILE_POSTS_QUERY } from '../api/profile.constants.ts';
import { OFFLINE_DATABASE, OFFLINE_CHANNEL, OFFLINE_REVOCATION, OFFLINE_KNOWN_GENERATION } from './offline.constants.ts';
import type { OfflineCopy, OfflineToken, OfflineClearToken, SavedPosts, SavedProfile } from './offline.types.ts';

let connection: Promise<IDBDatabase> | undefined;
let channel: BroadcastChannel | undefined;
let storageError = false;
let pendingRevocation: string[] = [];
const knownGenerations = new Set<string>();

/** Хранит только ревизию отозванной копии, если IndexedDB временно отказала. */
function rememberRevocation(generations: readonly string[]): void {
  pendingRevocation = [...generations];
  try {
    localStorage.setItem(OFFLINE_REVOCATION, JSON.stringify(generations));
  } catch {
    // При отказе обоих хранилищ ревизия остаётся в памяти вкладки.
  }
}

/** Читает служебную отметку без персональных данных. */
function readRevocation(): string[] {
  try {
    const value = localStorage.getItem(OFFLINE_REVOCATION);
    if (!value) {
      return pendingRevocation;
    }
    try {
      const parsed: unknown = JSON.parse(value);
      if (Array.isArray(parsed) && parsed.every((item) => typeof item === 'string')) {
        return parsed;
      }
    } catch {
      // Сохраняем поддержку прежней служебной отметки с одной ревизией.
    }
    return [value];
  } catch {
    return pendingRevocation;
  }
}

/** Запоминает ревизию только после успешной транзакции сохранения копии. */
function rememberGeneration(generation: string): void {
  knownGenerations.add(generation);
  try {
    localStorage.setItem(OFFLINE_KNOWN_GENERATION + generation, '1');
  } catch {
    // Если localStorage недоступна, остаётся резерв в памяти вкладки.
  }
}

/** Удаляет только завершённую ревизию, не трогая сведения о новых аккаунтах. */
function forgetGeneration(generation: string): void {
  knownGenerations.delete(generation);
  try {
    localStorage.removeItem(OFFLINE_KNOWN_GENERATION + generation);
  } catch {
    // Запись об устаревшей ревизии не разрешает очищать новую ревизию.
  }
}

/** Снимает резервные ревизии до HTTP, не читая персональные данные. */
export function captureOfflineClearFallback(): OfflineClearToken {
  const generations = new Set(knownGenerations);
  try {
    for (let index = 0; index < localStorage.length; index += 1) {
      const key = localStorage.key(index);
      if (key?.startsWith(OFFLINE_KNOWN_GENERATION)) {
        generations.add(key.slice(OFFLINE_KNOWN_GENERATION.length));
      }
    }
  } catch {
    // Используем только уже известные ревизии этой вкладки.
  }
  return { generations: [...generations] };
}

/** Открывает только базу приложения и закрывает соединение при обновлении схемы. */
function openDatabase(): Promise<IDBDatabase> {
  if (!connection) {
    connection = new Promise<IDBDatabase>((resolve, reject) => {
      let abandoned = false;
      const request = indexedDB.open(OFFLINE_DATABASE, 1);
      request.onupgradeneeded = () => {
        request.result.createObjectStore('copies');
        const metadata = request.result.createObjectStore('metadata');
        metadata.put({ generation: crypto.randomUUID(), ownerId: null }, 'current');
      };
      request.onerror = () => reject(request.error);
      request.onblocked = () => {
        abandoned = true;
        reject(new Error('Offline database upgrade blocked'));
      };
      request.onsuccess = () => {
        const database = request.result;
        if (abandoned) {
          database.close();
          return;
        }
        database.onversionchange = () => {
          database.close();
          connection = undefined;
        };
        resolve(database);
      };
    }).catch((error) => {
      connection = undefined;
      throw error;
    });
  }
  return connection;
}

/** Проверяет метаданные и выполняет операции копии в одной короткой транзакции. */
async function transaction<T>(mode: IDBTransactionMode, operation: (token: OfflineToken, tx: IDBTransaction, result: (value: T) => void) => void): Promise<T | undefined> {
  try {
    const database = await openDatabase();
    const revoked = readRevocation();
    let flushed = false;
    const value = await new Promise<T>((resolve, reject) => {
      const tx = database.transaction(['metadata', 'copies'], revoked.length ? 'readwrite' : mode);
      let result: T;
      tx.oncomplete = () => resolve(result);
      tx.onabort = () => reject(tx.error ?? new Error('Offline transaction aborted'));
      tx.onerror = () => reject(tx.error);
      const request = tx.objectStore('metadata').get('current');
      request.onsuccess = () => {
        try {
          let token: OfflineToken = request.result;
          if (revoked.includes(token.generation)) {
            tx.objectStore('copies').clear();
            token = { generation: crypto.randomUUID(), ownerId: null };
            tx.objectStore('metadata').put(token, 'current');
            flushed = true;
          }
          operation(token, tx, (next) => { result = next; });
        } catch {
          tx.abort();
        }
      };
    });
    if (flushed) {
      pendingRevocation = [];
      revoked.forEach(forgetGeneration);
      try {
        if (JSON.stringify(readRevocation()) === JSON.stringify(revoked)) {
          localStorage.removeItem(OFFLINE_REVOCATION);
        }
      } catch {
        // Старая отметка не совпадает с новой ревизией и не открывает доступ к копии.
      }
      channel?.postMessage('changed');
    }
    storageError = false;
    return value;
  } catch (error) {
    if (!storageError) {
      console.warn('Offline-копия недоступна', error);
    }
    storageError = true;
    return undefined;
  }
}

/** Позволяет интерфейсу отличить ошибку хранилища от отсутствующей копии. */
export function hasOfflineStorageError(): boolean {
  return storageError;
}

/** Снимает ревизию до сетевого запроса, сама ревизия не подтверждает сессию. */
export async function captureOfflineToken(): Promise<OfflineToken | undefined> {
  const token = await transaction<OfflineToken>('readonly', (current, _tx, result) => result(current));
  if (token?.ownerId) {
    rememberGeneration(token.generation);
  }
  return token;
}

/** undefined означает недоступность хранилища, null означает устаревший запрос. */
export async function saveOfflineProfile(expected: OfflineToken | undefined, profile: Profile, isCurrent: () => boolean): Promise<OfflineToken | null | undefined> {
  if (!expected) {
    return undefined;
  }
  const next = await transaction<OfflineToken | null>('readwrite', (token, tx, result) => {
    if (token.generation !== expected.generation || !isCurrent()) {
      result(null);
      return;
    }
    if (token.ownerId !== profile.user.id) {
      tx.objectStore('copies').clear();
      token = {
        generation: crypto.randomUUID(),
        ownerId: profile.user.id,
      };
      tx.objectStore('metadata').put(token, 'current');
    }
    const saved: SavedProfile = {
      savedAt: Date.now(),
      user: { id: profile.user.id, username: profile.user.username, nickname: profile.user.nickname },
    };
    if (profile.author) {
      saved.author = { bio: profile.author.bio };
    }
    tx.objectStore('copies').put(saved, [profile.user.id, 'profile']);
    result(token);
  });
  if (next) {
    rememberGeneration(next.generation);
    if (next.generation !== expected.generation) {
      forgetGeneration(expected.generation);
      channel?.postMessage('changed');
    }
  }
  return next;
}

/** Сохраняет только полученную страницу и её параметры, чужие элементы отклоняет. */
export function saveOfflinePosts(expected: OfflineToken | undefined, posts: ProfilePosts, query: ProfilePostsQuery, isCurrent: () => boolean): Promise<boolean | undefined> {
  if (!expected?.ownerId) {
    return Promise.resolve(undefined);
  }
  return transaction('readwrite', (token, tx, result) => {
    if (!token.ownerId || token.generation !== expected.generation || token.ownerId !== expected.ownerId || !isCurrent()
      || posts.items.some((item) => item.author.id !== token.ownerId)) {
      result(false);
      return;
    }
    const saved: SavedPosts = {
      savedAt: Date.now(),
      query: { sort: query.sort, limit: query.limit ?? DEFAULT_PROFILE_POSTS_QUERY.limit },
      items: posts.items.map((item) => ({
        id: item.id,
        title: item.title,
        locked: item.locked,
        body_preview: item.locked ? '' : item.body_preview,
        published_or_updated_at: item.published_or_updated_at,
      })),
      next_cursor: posts.next_cursor,
    };
    if (query.cursor !== undefined) {
      saved.query.cursor = query.cursor;
    }
    tx.objectStore('copies').put(saved, [token.ownerId, 'posts']);
    result(true);
  });
}

/** Очищает копию только ожидаемой ревизии, старый выход не затрагивает новый аккаунт. */
export async function clearOfflineCopy(expected: OfflineClearToken | undefined, isCurrent: () => boolean): Promise<boolean | undefined> {
  if (!expected) {
    return undefined;
  }
  const generations = 'generation' in expected ? [expected.generation] : expected.generations;
  if (!generations.length) {
    return undefined;
  }
  let clearedGeneration: string | undefined;
  let notifyTabs = false;
  const cleared = await transaction<boolean>('readwrite', (token, tx, result) => {
    if (!generations.includes(token.generation) || !isCurrent()) {
      result(false);
      return;
    }
    clearedGeneration = token.generation;
    notifyTabs = token.ownerId !== null;
    tx.objectStore('copies').clear();
    tx.objectStore('metadata').put({ generation: crypto.randomUUID(), ownerId: null }, 'current');
    result(true);
  });
  if (cleared) {
    if (clearedGeneration) {
      forgetGeneration(clearedGeneration);
    }
    if (notifyTabs) {
      channel?.postMessage('changed');
    }
  } else if (cleared === undefined && isCurrent()) {
    rememberRevocation(generations);
    channel?.postMessage('changed');
  }
  return cleared;
}

/** Читает только копию текущего владельца, не меняя состояние авторизации. */
export function readOfflineCopy(ownerId?: string): Promise<OfflineCopy | null | undefined> {
  return transaction('readonly', (token, tx, result) => {
    if (!token.ownerId || (ownerId !== undefined && token.ownerId !== ownerId)) {
      result(null);
      return;
    }
    const copy: OfflineCopy = { ownerId: token.ownerId, generation: token.generation };
    const profile = tx.objectStore('copies').get([token.ownerId, 'profile']);
    const posts = tx.objectStore('copies').get([token.ownerId, 'posts']);
    profile.onsuccess = () => { copy.profile = profile.result; };
    posts.onsuccess = () => { copy.posts = posts.result; };
    result(copy);
  });
}

/** Слушает изменения других вкладок на время работы приложения. */
export function initOfflineSync(onChange: () => void): () => void {
  if (!('BroadcastChannel' in globalThis)) {
    return () => {};
  }
  const current = new BroadcastChannel(OFFLINE_CHANNEL);
  channel = current;
  current.onmessage = onChange;
  return () => {
    current.close();
    if (channel === current) {
      channel = undefined;
    }
  };
}
