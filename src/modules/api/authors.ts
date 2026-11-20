import { request } from './request.ts';

interface AuthorSearchItem {
  username: string;
  nickname: string;
  avatar_url: string | null;
  bio: string;
}

interface AuthorSearchPage {
  items: AuthorSearchItem[];
  next_cursor: string | null;
}

/** Ищет авторов по отображаемому имени или имени пользователя. */
export function searchAuthors(q: string): Promise<AuthorSearchPage> {
  return request<AuthorSearchPage>(`/authors?${new URLSearchParams({ q })}`);
}
