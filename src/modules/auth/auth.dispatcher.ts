import { Dispatcher } from '@/modules/flux/dispatcher.ts';
import type { AuthAction } from './auth.types.ts';

export const authDispatcher = new Dispatcher<AuthAction>();
