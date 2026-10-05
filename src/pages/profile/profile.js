import { render } from '../../app/view.js';
import { getProfile, getProfilePosts } from '../../modules/api/profile.js';
import { ApiError } from '../../modules/api/request.js';
import { formatPostCount, formatPublishedAt } from '../../utils/helpers/posts.js';

/**
 * Готовит профиль и посты для шаблона.
 * @param {Object} profileResponse - Данные пользователя.
 * @param {Object} postsResponse - Данные постов.
 * @returns {Object} Данные для шаблона.
 */
export function buildProfileViewModel(profileResponse, postsResponse) {
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
    hasAuthor: Boolean(profileResponse.author),
    bio: profileResponse.author?.bio ?? '',
    avatarUrl: '/assets/profile/avatar-placeholder.svg',
    postCountLabel: formatPostCount(posts.length),
    hasPosts: posts.length > 0,
    posts,
  };
}

/**
 * Возвращает каркас профиля с текстом загрузки.
 * @returns {string} HTML страницы профиля.
 */
export function renderProfile() {
  return render('pages/profile/profile', { message: 'Загрузка профиля...' });
}

/**
 * Загружает профиль и показывает данные или ошибку.
 * @param {HTMLElement} root - Контейнер страницы.
 * @param {(path: string) => void} navigate - Функция перехода.
 * @returns {Promise<void>}
 */
export async function initProfile(root, navigate) {
  // Проверяем узел, чтобы старый запрос не обновил повторно открытый профиль.
  const loadingPage = root.firstElementChild;
  try {
    const [profileResponse, postsResponse] = await Promise.all([getProfile(), getProfilePosts()]);
    if (root.firstElementChild !== loadingPage) return;
    const data = buildProfileViewModel(profileResponse, postsResponse);
    root.innerHTML = render('pages/profile/profile', data);
  } catch (err) {
    if (root.firstElementChild !== loadingPage) return;
    if (err instanceof ApiError && err.status === 401) {
      navigate('/login');
      return;
    }
    const message = err instanceof ApiError && err.status === 0
      ? 'Сервер недоступен. Проверьте интернет и попробуйте ещё раз'
      : 'Что-то пошло не так. Попробуйте позже';
    root.innerHTML = render('pages/profile/profile', { message, isError: true });
  }
}
