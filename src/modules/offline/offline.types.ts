import type { ProfilePost, ProfilePostsQuery } from '../api/profile.types.ts';

/** Ревизия хранилища, не является токеном авторизации. */
export interface OfflineToken {
  generation: string;
  ownerId: string | null;
}

/** Резервные ревизии захватываются до запроса, без подтверждения владельца. */
export type OfflineClearToken = OfflineToken | { generations: readonly string[] };

export interface SavedProfile {
  savedAt: number;
  user: { id: string; username: string; nickname: string };
  author?: { bio: string };
}

export interface SavedPosts {
  savedAt: number;
  query: ProfilePostsQuery;
  items: Pick<ProfilePost, 'id' | 'title' | 'locked' | 'body_preview' | 'published_or_updated_at'>[];
  next_cursor: string | null;
}

export interface OfflineCopy {
  generation: string;
  ownerId: string;
  profile?: SavedProfile;
  posts?: SavedPosts;
}
