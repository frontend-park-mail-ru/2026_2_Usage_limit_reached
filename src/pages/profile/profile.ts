import profileTemplate from './profile.hbs';
import { checkSession, loadProfilePosts } from '../../modules/auth/auth.actions.ts';
import type { Profile, ProfilePosts } from '../../modules/api/profile.types.ts';
import { ApiError } from '../../modules/api/request.ts';
import { formatPostCount, formatPublishedAt } from '../../utils/helpers/posts.ts';

/**
 * Готовит профиль и опубликованные посты для шаблона.
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

/** Возвращает каркас профиля с текстом загрузки. */
export function renderProfile(): string {
  return profileTemplate({ message: 'Загрузка профиля...' });
}

/**
 * Загружает профиль и показывает данные или ошибку.
 * @param root
 */
export async function initProfile(root: HTMLElement): Promise<void> {
  const loadingPage = root.firstElementChild;
  try {
    const [profileResponse, postsResponse] = await Promise.all([checkSession(), loadProfilePosts()]);
    if (!profileResponse || !postsResponse || root.firstElementChild !== loadingPage) {
      return;
    }
    const data = buildProfileViewModel(profileResponse, postsResponse);
    root.innerHTML = profileTemplate(data);
  } catch (err) {
    if (root.firstElementChild !== loadingPage) {
      return;
    }
    if (err instanceof ApiError && err.status === 401) {
      return;
    }
    const message = err instanceof ApiError && err.status === 0
      ? 'Сервер недоступен. Проверьте интернет и попробуйте ещё раз'
      : 'Что-то пошло не так. Попробуйте позже';
    root.innerHTML = profileTemplate({ message, isError: true });
  }
}
