import type { Profile } from '@/modules/api/profile.types.ts';
import type { SessionContext } from '@/modules/auth/auth.types.ts';

export interface SavedProfileNavigation {
  readonly profile: Profile | undefined;
  readonly context: SessionContext;
}

export type ProfileAction = {
  type: 'profile/navigation';
  saved: SavedProfileNavigation | undefined;
};
