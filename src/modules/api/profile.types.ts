export interface ProfileUser {
  id: string;
  username: string;
  nickname: string;
  email: string;
  avatar_url?: string;
  created_at: string;
}

export interface ProfileAuthor {
  bio: string;
  category: string;
  payout_provider: string | null;
  payout_account_id: string | null;
}

export interface Profile {
  user: ProfileUser;
  author?: ProfileAuthor;
}

export interface ProfileUserUpdate {
  username: string;
  nickname: string;
  email: string;
}

export interface ProfileUpdate {
  user: ProfileUserUpdate;
  author?: ProfileAuthor;
}

export interface AvatarResponse {
  avatar_url: string;
}

export interface ProfilePostAuthor {
  id: string;
  username: string;
  nickname: string;
  avatar_url?: string;
}

export interface ProfilePost {
  id: string;
  author: ProfilePostAuthor;
  locked: boolean;
  title: string;
  body_preview: string;
  likes_count: number;
  liked_by_user: boolean;
  published_or_updated_at: string | null;
}

export interface ProfilePosts {
  items: ProfilePost[];
  next_cursor: string | null;
}

export interface ProfilePostsQuery {
  sort: 'new' | 'old' | 'popular';
  limit?: number;
  cursor?: string;
}
