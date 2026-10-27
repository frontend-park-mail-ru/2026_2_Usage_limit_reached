export type ProfileUser = {
  username: string;
  nickname: string;
};

export type ProfileAuthor = {
  bio: string;
};

export type Profile = {
  user: ProfileUser;
  author?: ProfileAuthor;
};

export type ProfilePost = {
  id: number;
  title: string;
  body: string;
  status: string;
  published_at: string | null;
};

export type ProfilePosts = {
  posts: ProfilePost[];
};
