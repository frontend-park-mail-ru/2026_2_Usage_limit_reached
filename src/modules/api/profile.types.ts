export interface ProfileUser {
  username: string;
  nickname: string;
}

export interface ProfileAuthor {
  bio: string;
}

export interface Profile {
  user: ProfileUser;
  author?: ProfileAuthor;
}

export interface ProfilePost {
  id: number;
  title: string;
  body: string;
  status: string;
  published_at: string | null;
}

export interface ProfilePosts {
  posts: ProfilePost[];
}
