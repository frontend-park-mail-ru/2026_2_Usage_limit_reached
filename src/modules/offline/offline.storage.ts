import type { Profile, ProfilePosts, ProfilePostsQuery } from '@/modules/api/profile.types.ts';
import { DEFAULT_PROFILE_POSTS_QUERY } from '@/modules/api/profile.constants.ts';
import { OFFLINE_DATABASE, OFFLINE_CHANNEL, OFFLINE_REVOCATION, OFFLINE_KNOWN_GENERATION } from './offline.constants.ts';
import type { OfflineCopy, OfflineToken, OfflineClearToken, SavedPosts, SavedProfile } from './offline.types.ts';
import type { PostsQuery } from '@/modules/api/posts.types.ts';
import { ApiError } from '@/modules/api/request.ts';
import { clearUnavailablePreviews, copyOfflinePreview, getOfflineDeadline, revokedPreviewIds } from './offline.deadline.ts';

const MAX_POST_PAGES = 20;
const MAX_POST_BYTES = 512 * 1024;
const MAX_POST_AGE = 7 * 24 * 60 * 60 * 1000;

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
export async function captureOfflineToken(publications = false): Promise<OfflineToken | undefined> {
  const token = await transaction<OfflineToken>(publications ? 'readwrite' : 'readonly', (current, tx, result) => {
    if (publications) {
      current.publicationSequence = (current.publicationSequence ?? 0) + 1;
      tx.objectStore('metadata').put(current, 'current');
    }
    result(current);
  });
  if (token?.ownerId) {
    rememberGeneration(token.generation);
  }
  return token;
}

/** Регистрирует порядок ответа отдельно для каждого поста в текущей ревизии. */
export function staleOfflinePublications(
  store: IDBObjectStore, token: OfflineToken, order: number, ids: string[], revoked: Set<string>,
  source: 'body' | 'preview', missing = false,
): Set<string> {
  const orders = token.publicationOrders ??= new Map();
  const stale = new Set<string>();
  for (const id of ids) {
    const latest = orders.get(id) ?? {};
    const newer = source === 'body' ? latest.body : revoked.has(id) ? Math.max(latest.body ?? 0, latest.preview ?? 0) : undefined;
    if ((newer ?? 0) > order || (!missing && (latest.revoked ?? 0) > order)) {
      stale.add(id);
      revoked.delete(id);
    } else {
      orders.set(id, {
        ...latest, [source]: Math.max(latest[source] ?? 0, order),
        revoked: revoked.has(id) ? (token.publicationSequence ?? order) + 1 : latest.revoked,
      });
    }
  }
  store.transaction.objectStore('metadata').put(token, 'current');
  return stale;
}

/** Выполняет операцию с копией только для ожидаемой ревизии и актуального запроса. */
export function accessOfflineCopy<T>(
  expected: OfflineToken | undefined,
  mode: IDBTransactionMode,
  isCurrent: () => boolean,
  operation: (store: IDBObjectStore, result: (value: T) => void, token: OfflineToken) => void,
): Promise<T | undefined> {
  if (!expected) {
    return Promise.resolve(undefined);
  }
  return transaction(mode, (token, tx, result) => {
    if (token.generation === expected.generation && token.ownerId === expected.ownerId && isCurrent()) {
      operation(tx.objectStore('copies'), result, token);
    }
  });
}

/** Очищает контент или удаляет карточки в транзакции текущей ревизии. */
export function cleanOfflinePublications(
  store: IDBObjectStore, token: OfflineToken, revoked?: ReadonlySet<string>, removeCards = false,
): void {
  if (revoked?.size === 0) {
    return;
  }
  const request = store.openCursor();
  request.onsuccess = () => {
    const cursor = request.result;
    if (!cursor) {
      return;
    }
    const [kind, section, page] = cursor.key as string[];
    const entry = cursor.value;
    if (kind === 'post' && (revoked ? revoked.has(section) : getOfflineDeadline(entry.page?.offline_cache_until) === undefined)) {
      cursor.delete();
    } else if (kind === 'feed' || (kind === 'public' && page === 'posts') || (kind === token.ownerId && section === 'posts')) {
      const list = (entry.page ?? entry) as Pick<SavedPosts, 'items'>;
      const items = list.items ?? [];
      if (removeCards && revoked) {
        list.items = items.filter((item) => !revoked.has(item.id));
        if (list.items.length !== items.length) {
          cursor.update(entry);
        }
      } else if (clearUnavailablePreviews(items, revoked)) {
        cursor.update(entry);
      }
    }
    cursor.continue();
  };
}

/** Удаляет просроченные публикации из копий текущей ревизии. */
export async function expireOfflinePublications(isCurrent: () => boolean): Promise<void> {
  const token = await captureOfflineToken();
  await accessOfflineCopy(token, 'readwrite', isCurrent, (store, _, current) => cleanOfflinePublications(store, current));
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
      saved.author = { bio: profile.author.bio, category: profile.author.category };
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

/** Сохраняет непрерывное начало списка отдельно для каждой сортировки. */
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
        ...copyOfflinePreview(item),
        likes_count: item.likes_count,
        liked_by_user: item.liked_by_user,
        published_or_updated_at: item.published_or_updated_at,
      })),
      next_cursor: posts.next_cursor,
    };
    const key = [token.ownerId, 'posts', query.sort];
    const store = tx.objectStore('copies');
    const revoked = revokedPreviewIds(posts.items);
    const stale = staleOfflinePublications(store, token, expected.publicationSequence ?? 0, posts.items.map(({ id }) => id), revoked, 'preview');
    posts.items = posts.items.filter(({ id }) => !stale.has(id));
    const request = store.get(key);
    request.onsuccess = () => {
      const previous: SavedPosts | undefined = request.result;
      saved.items = saved.items.flatMap((item) => stale.has(item.id)
        ? previous?.items.find(({ id }) => id === item.id) ?? [] : item);
      saved.pages = 1;
      if (query.cursor) {
        if (!previous || previous.next_cursor !== query.cursor || previous.query.limit !== saved.query.limit
          || (previous.pages ?? 1) >= MAX_POST_PAGES || Date.now() - previous.savedAt > MAX_POST_AGE) {
          cleanOfflinePublications(store, token, revoked);
          result(true);
          return;
        }
        saved.pages = (previous.pages ?? 1) + 1;
        saved.savedAt = previous.savedAt;
        saved.items = [...new Map([...previous.items, ...saved.items].map((item) => [item.id, item])).values()];
      }
      if (new Blob([JSON.stringify(saved)]).size <= MAX_POST_BYTES) {
        store.put(saved, key);
      } else if (!query.cursor) {
        store.delete(key);
      }
      cleanOfflinePublications(store, token, revoked);
      result(true);
    };
  });
}

/** После изменения отзывает текущую копию того же владельца, независимо от её ревизии. */
export async function invalidateOfflineCopy(ownerId: string, fallback?: OfflineToken): Promise<boolean | undefined> {
  const token = await captureOfflineToken() ?? fallback;
  if (!token || token.ownerId === null) {
    return undefined;
  }
  if (token.ownerId !== ownerId) {
    return false;
  }
  return clearOfflineCopy(token, () => true, ownerId);
}

/** Очищает ожидаемую ревизию, при изменении данных проверяет владельца в транзакции. */
export async function clearOfflineCopy(expected: OfflineClearToken | undefined, isCurrent: () => boolean, ownerId?: string): Promise<boolean | undefined> {
  if (!expected) {
    return undefined;
  }
  const generations = 'generation' in expected ? [expected.generation] : expected.generations;
  if (!generations.length) {
    return undefined;
  }
  let clearedGeneration: string | undefined;
  let nextToken: OfflineToken | undefined;
  let notifyTabs = false;
  const cleared = await transaction<boolean>('readwrite', (token, tx, result) => {
    const matches = ownerId === undefined ? generations.includes(token.generation) : token.ownerId === ownerId;
    if (!matches || !isCurrent()) {
      result(false);
      return;
    }
    clearedGeneration = token.generation;
    notifyTabs = token.ownerId !== null;
    tx.objectStore('copies').clear();
    nextToken = { generation: crypto.randomUUID(), ownerId: ownerId ?? null };
    tx.objectStore('metadata').put(nextToken, 'current');
    result(true);
  });
  if (cleared) {
    if (clearedGeneration) {
      forgetGeneration(clearedGeneration);
    }
    if (nextToken?.ownerId) {
      rememberGeneration(nextToken.generation);
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
export function readOfflineCopy(ownerId?: string, sort: PostsQuery['sort'] = 'new'): Promise<OfflineCopy | null | undefined> {
  return transaction('readwrite', (token, tx, result) => {
    if (!token.ownerId || (ownerId !== undefined && token.ownerId !== ownerId)) {
      result(null);
      return;
    }
    const copy: OfflineCopy = { ownerId: token.ownerId, generation: token.generation };
    const store = tx.objectStore('copies');
    const profile = store.get([token.ownerId, 'profile']);
    const key = [token.ownerId, 'posts', sort];
    const legacyKey = [token.ownerId, 'posts'];
    const posts = store.get(key);
    profile.onsuccess = () => { copy.profile = profile.result; };
    posts.onsuccess = () => {
      const legacy = store.get(legacyKey);
      legacy.onsuccess = () => {
        const saved: SavedPosts | undefined = posts.result ?? legacy.result;
        if (saved?.query.sort === sort && !saved.query.cursor && Date.now() - saved.savedAt <= MAX_POST_AGE) {
          if (clearUnavailablePreviews(saved.items)) {
            store.put(saved, posts.result ? key : legacyKey);
          }
          copy.posts = saved;
        }
      };
    };
    result(copy);
  });
}

/** Возвращает сохранённый список порциями, не выдавая отсутствующий хвост за конец списка. */
export async function readOfflineOwnPosts(ownerId: string, query: PostsQuery, isCurrent: () => boolean) {
  const copy = await readOfflineCopy(ownerId, query.sort);
  const offset = query.cursor ? Number(query.cursor) : 0;
  const posts = copy?.posts;
  if (!isCurrent() || !copy?.profile || !posts || !Number.isSafeInteger(offset) || offset < 0
    || (offset > 0 && offset >= posts.items.length)) {
    throw new ApiError(0, 'offline_copy_missing');
  }
  const limit = posts.query.limit ?? DEFAULT_PROFILE_POSTS_QUERY.limit;
  const end = offset + limit;
  const author = copy.profile.user;
  return {
    savedAt: posts.savedAt,
    items: posts.items.slice(offset, end).map((item) => ({
      ...item, author, hasLikesCount: item.likes_count !== undefined,
      likes_count: item.likes_count ?? 0, liked_by_user: item.liked_by_user ?? false,
    })),
    next_cursor: end < posts.items.length || posts.next_cursor ? String(end) : null,
  };
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
