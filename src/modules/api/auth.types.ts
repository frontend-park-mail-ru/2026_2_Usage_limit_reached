export interface SignupData {
  email: string;
  username: string;
  nickname: string;
  password: string;
}

export interface LoginData {
  login: string;
  password: string;
}

export interface AuthUser {
  username: string;
  nickname: string;
  avatar_url?: string;
}
