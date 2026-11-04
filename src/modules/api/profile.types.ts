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

export interface ProfilePost {
  id: string;
  title: string;
  body: string;
  status: string;
  published_at?: string;
}

export interface ProfilePosts {
  user_id: string;
  posts: ProfilePost[];
}
