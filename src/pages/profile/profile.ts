import { render } from '../../app/view.ts';
import { getProfile, getProfilePosts } from '../../modules/api/profile.ts';
import type { Profile, ProfilePosts } from '../../modules/api/profile.types.ts';
import { ApiError } from '../../modules/api/request.ts';
import { formatPostCount, formatPublishedAt } from '../../utils/helpers/posts.ts';
import { ROUTES } from '../../app/paths.ts';
import type { Navigate } from '../../app/paths.ts';

/**
 * @param profileResponse
 * @param postsResponse
 */
export function buildProfileViewModel(profileResponse: Profile, postsResponse: ProfilePosts) {
  const referenceTime = new Date();
  const posts = postsResponse.posts.filter((post) => post.status === 'published').map((post) => {
    const publishedAt = post.published_at ?? '';
    return {
      id: post.id,
      title: post.title,
      body: post.body,
      publishedAt,
      publishedAtLabel: formatPublishedAt(publishedAt, referenceTime),
    };
  });
  return {
    name: profileResponse.user.nickname,
    username: `@${profileResponse.user.username}`,
    hasAuthor: !!profileResponse.author,
    bio: profileResponse.author?.bio ?? '',
    avatarUrl: '/assets/profile/avatar-placeholder.svg',
    postCountLabel: formatPostCount(posts.length),
    hasPosts: posts.length > 0,
    posts,
  };
}

export function renderProfile(): string {
  return render('pages/profile/profile', { message: 'Загрузка профиля...' });
}

/**
 * @param root
 * @param navigate
 */
export async function initProfile(root: HTMLElement, navigate: Navigate): Promise<void> {
  const loadingPage = root.firstElementChild;
  try {
    const [profileResponse, postsResponse] = await Promise.all([getProfile(), getProfilePosts()]);
    if (root.firstElementChild !== loadingPage) {
      return;
    }
    const data = buildProfileViewModel(profileResponse, postsResponse);
    root.innerHTML = render('pages/profile/profile', data);
  } catch (err) {
    if (root.firstElementChild !== loadingPage) {
      return;
    }
    if (err instanceof ApiError && err.status === 401) {
      navigate(ROUTES.login);
      return;
    }
    const message = err instanceof ApiError && err.status === 0
      ? 'Сервер недоступен. Проверьте интернет и попробуйте ещё раз'
      : 'Что-то пошло не так. Попробуйте позже';
    root.innerHTML = render('pages/profile/profile', { message, isError: true });
  }
}
