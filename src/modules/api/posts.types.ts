export type PostStatus = 'draft' | 'published' | 'archived';

export type PostsSort = 'new' | 'old' | 'popular';

export interface PostAuthor {
  id: string;
  username: string;
  nickname: string;
  avatar_url?: string | null;
}

export interface PostPreview {
  id: string;
  author: PostAuthor;
  locked: boolean;
  title: string;
  body_preview: string;
  likes_count: number;
  liked_by_user: boolean;
  published_or_updated_at: string | null;
}

export interface PostsPage {
  items: PostPreview[];
  next_cursor: string | null;
}

export interface PostsQuery {
  sort: PostsSort;
  cursor?: string | null;
}

export interface Post {
  id: string;
  author: PostAuthor;
  title: string;
  body: string;
  status: PostStatus;
  published_at: string | null;
  created_at: string;
  updated_at: string;
  locked: boolean;
  likes_count: number;
  liked_by_user: boolean;
}

export interface PostInput {
  title: string;
  body: string;
  status: PostStatus;
}

export interface PostUpdate extends PostInput {
  last_updated_at: string;
}

export interface CreatedPost {
  id: string;
}

export interface PostLikes {
  likes_count: number;
  liked_by_user: boolean;
}
