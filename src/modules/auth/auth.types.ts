import type { OfflineToken } from '@/modules/offline/offline.types.ts';

/** Пользователь с ID, только если он получен из собственного профиля. */
export interface SessionUser {
  readonly id?: string;
  readonly username: string;
  readonly nickname: string;
  readonly avatar_url?: string;
}

/** Контекст подтверждённого аккаунта, заменяется после повторного входа. */
export interface SessionContext {
  readonly userId: string;
  readonly offlineToken?: OfflineToken;
}

export type AuthState =
  | { readonly status: 'unknown'; readonly user: null }
  | { readonly status: 'guest'; readonly user: null }
  | { readonly status: 'authenticated'; readonly user: SessionUser };

export type AuthAction =
  | { type: 'auth/authenticated'; user: SessionUser }
  | { type: 'auth/guest' }
  | { type: 'auth/unknown' };
