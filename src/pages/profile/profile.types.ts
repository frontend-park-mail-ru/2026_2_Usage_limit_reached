import type { PostsSort } from '@/modules/api/posts.types.ts';

export type ProfileTab = 'posts' | 'drafts';

export interface ProfileTabItem {
  value: ProfileTab;
  label: string;
}

export interface SortOption {
  value: PostsSort;
  label: string;
}
