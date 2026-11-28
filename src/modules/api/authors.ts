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
export function searchAuthors(q: string, tags: string[], cursor: string | null): Promise<AuthorSearchPage> {
  const params = new URLSearchParams();
  if (q) {
    params.set('q', q);
  }
  tags.forEach((tag) => params.append('tag', tag));
  if (cursor !== null) {
    params.set('cursor', cursor);
  }
  return request<AuthorSearchPage>(`/authors?${params}`);
}
