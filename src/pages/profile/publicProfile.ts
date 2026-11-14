import { startLoading, cancelLoading } from '@/utils/helpers/delayedLoading.ts';
import profileTemplate from './publicProfile.hbs';
import { bindProfileBio } from '@/components/profileBio/profileBio.ts';
import { DonateDialog } from '@/components/donateDialog/donateDialog.ts';
import { showToast } from '@/components/toast/toast.ts';
import { checkSession, getSessionContext } from '@/modules/auth/auth.actions.ts';
import { getPublicProfile } from '@/modules/api/profile.ts';
import { getPublicPosts } from '@/modules/api/posts.ts';
import { ApiError } from '@/modules/api/request.ts';
import { AVATAR_PLACEHOLDER } from '@/modules/profile/profile.constants.ts';
import { ROUTES } from '@/app/paths.ts';
import type { Navigate } from '@/app/paths.ts';
import type { RouteParams } from '@/app/router.types.ts';
import { requireElement } from '@/utils/helpers/dom.ts';
import { LOAD_ERROR, LOADING_MESSAGE } from './profile.constants.ts';
import { bindLikedPosts } from '@/components/postsList/bindLikedPosts.ts';

/** Показывает состояние загрузки публичного профиля. */
export function renderPublicProfile(): string {
  return profileTemplate({ message: LOADING_MESSAGE, loading: true });
}

/**
 * Показывает профиль и подключает действия посетителя.
 * @param root
 * @param navigate
 * @param params
 */
export function initPublicProfile(root: HTMLElement, navigate: Navigate, params: RouteParams): () => void {
  let active = true;
  let disposePosts: (() => void) | undefined;
  let dialog: DonateDialog | undefined;
  let disposeBio: (() => void) | undefined;

  async function load(): Promise<void> {
    cancelLoading(root);
    root.innerHTML = renderPublicProfile();
    const stopLoading = startLoading(root);
    try {
      const { user, author } = await getPublicProfile(params.username);
      if (!active) {
        return;
      }
      document.title = user.nickname;
      root.innerHTML = profileTemplate({
        name: user.nickname, username: `@${user.username}`, avatarUrl: user.avatar_url ?? AVATAR_PLACEHOLDER,
        bio: author?.bio, isAuthor: !!author,
      });
      disposeBio = bindProfileBio(root);
      if (author) {
        disposePosts = bindLikedPosts(root, (query) => getPublicPosts(params.username, query), navigate);
        const donate = requireElement<HTMLButtonElement>(root, '[data-donate]');
        const donateDialog = new DonateDialog(requireElement(root, '.donate-dialog'));
        dialog = donateDialog;
        const updateDonate = () => { donate.hidden = getSessionContext()?.userId === user.id; };
        void checkSession().then(updateDonate, updateDonate);
        donate.addEventListener('click', async () => {
          donate.disabled = true;
          try {
            const viewer = await checkSession();
            if (!active) {
              return;
            }
            if (!viewer) {
              navigate(ROUTES.login);
            } else if (viewer.user.id !== user.id) {
              donateDialog.open(user);
            }
            updateDonate();
          } catch (error) {
            if (active) {
              if (error instanceof ApiError && error.isUnauthorized) {
                navigate(ROUTES.login);
              } else {
                showToast(error instanceof ApiError ? error.text : LOAD_ERROR);
              }
            }
          } finally {
            donate.disabled = false;
          }
        });
      }
    } catch (error) {
      if (active) {
        disposeBio?.();
        const missing = error instanceof ApiError && error.status === 404;
        root.innerHTML = profileTemplate({
          message: missing ? 'Профиль не найден' : LOAD_ERROR, isError: true, canRetry: !missing,
        });
        root.querySelector('[data-profile-retry]')?.addEventListener('click', () => { void load(); });
      }
    } finally {
      stopLoading();
    }
  }
  void load();
  return () => {
    active = false;
    disposeBio?.();
    disposePosts?.();
    dialog?.destroy();
  };
}
