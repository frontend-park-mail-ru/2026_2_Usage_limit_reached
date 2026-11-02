/** Общие поля пользователя в ответах входа и проверки сессии. */
export interface SessionUser {
  readonly username: string;
  readonly nickname: string;
}

export type AuthState =
  | { readonly status: 'unknown'; readonly user: null }
  | { readonly status: 'guest'; readonly user: null }
  | { readonly status: 'authenticated'; readonly user: SessionUser };

export type AuthAction =
  | { type: 'auth/authenticated'; user: SessionUser }
  | { type: 'auth/guest' };
