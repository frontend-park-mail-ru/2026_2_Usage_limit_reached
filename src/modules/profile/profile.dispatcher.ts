import { Dispatcher } from '@/modules/flux/dispatcher.ts';
import type { ProfileAction } from './profile.types.ts';

export const profileDispatcher = new Dispatcher<ProfileAction>();
