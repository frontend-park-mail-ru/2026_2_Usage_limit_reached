import { setPostLike } from '@/modules/api/posts.ts';
import type { PostLikes } from '@/modules/api/posts.types.ts';
import { ApiError } from '@/modules/api/request.ts';
import { isSessionCurrent, runSessionRequest } from '@/modules/auth/auth.actions.ts';
import type { SessionContext } from '@/modules/auth/auth.types.ts';
import { showToast } from '@/components/toast/toast.ts';

export async function sendLike(
  id: string,
  liked: boolean,
  context: SessionContext,
  isActive: () => boolean
): Promise<PostLikes | null> {
  if (!isActive() || !isSessionCurrent(context)) {
    return null;
  }
  try {
    const result = await runSessionRequest(context, () => setPostLike(id, liked));
    return isActive() && isSessionCurrent(context) ? result ?? null : null;
  } catch (err) {
    if (!isActive() || !isSessionCurrent(context)) {
      return null;
    }
    if (!(err instanceof ApiError)) {
      throw err;
    }
    if (!err.isUnauthorized) {
      showToast(err.isCsrfError || err.isMutationTimeout || err.status === 0
        ? err.text
        : 'Лайк не сохранён. Попробуйте позже');
    }
    return null;
  }
}
