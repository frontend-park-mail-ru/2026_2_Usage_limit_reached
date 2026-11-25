import type { PostAttachment } from './attachments.ts';

export type PostStatus = 'draft' | 'published' | 'archived';

export type PostsSort = 'new' | 'old' | 'popular';

export interface PostAuthor {
  id: string;
  username: string;
  nickname: string;
  avatar_url?: string | null;
}

export interface PostAccessRestriction {
  reason: 'subscription_required' | 'upgrade_required' | 'no_eligible_tier';
  required_tier: { id: string; name: string; status: 'open' | 'archived' };
  current_tier: { id: string; name: string } | null;
  lowest_available_price_minor: number | null;
  currency: string;
}

export interface PostPreview {
  id: string;
  author: PostAuthor;
  locked: boolean;
  title: string;
  body_preview: string;
  cover_url?: string | null;
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

export interface PostAccessStage {
  starts_at: string;
  min_tier_id: string | null;
}

export interface Post {
  id: string;
  author: PostAuthor;
  title: string;
  body: string;
  attachments?: PostAttachment[];
  cover_url?: string | null;
  min_tier_id?: string | null;
  access_schedule?: PostAccessStage[];
  publication_ends_at?: string | null;
  status: PostStatus;
  published_at: string | null;
  created_at: string;
  updated_at: string;
  locked: boolean;
  access_restriction?: PostAccessRestriction | null;
  likes_count: number;
  liked_by_user: boolean;
}

export interface PostInput {
  title: string;
  body: string;
  status: PostStatus;
  cover_id?: string | null;
  min_tier_id?: string | null;
  access_schedule?: PostAccessStage[];
  publication_ends_at?: string | null;
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
