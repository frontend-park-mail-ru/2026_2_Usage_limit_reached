import type { NavigationPath } from '@/app/paths.ts';

interface AdminStatusContent {
  title: string;
  message?: string;
  loginUrl?: NavigationPath;
  retry?: boolean;
}

interface AdminAuthorizedContent {
  authorized: true;
}

export interface AdminScreens {
  loading: AdminStatusContent;
  authorized: AdminAuthorizedContent;
  guest: AdminStatusContent;
  forbidden: AdminStatusContent;
  error: AdminStatusContent;
}

export type AdminScreen = keyof AdminScreens;
