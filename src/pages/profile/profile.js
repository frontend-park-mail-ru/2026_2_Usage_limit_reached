import { render } from '../../app/view.js';
import { formatPostCount, formatPublishedAt } from '../../utils/helpers/posts.js';

const PROFILE_RESPONSE = {
  user: {
    id: '00000000-0000-4000-8000-000000000001',
    username: 'ivan_petrov',
    nickname: 'Иван Петров',
    email: 'ivan@example.com',
    avatar_key: '',
    created_at: '2026-08-01T12:00:00Z',
  },
  author: {
    bio: 'Привет! Я Иван – блогер и просто человек, который делится здесь всем подряд: жизнь, мысли, закулисье, эксклюзивы и то, что не попадает в обычные публикации.',
    category: 'Блог',
  },
};

const POSTS_RESPONSE = {
  user_id: PROFILE_RESPONSE.user.id,
  posts: [
    {
      id: '00000000-0000-4000-8000-000000000101',
      title: 'Почему у одних есть а у других нет: разбираю по полочкам без прикрас и пустых обещаний',
      body: 'Разбираюсь, как люди зарабатывают деньги и какие привычки помогают им двигаться вперёд.',
      status: 'published',
      published_at: '2026-09-01T12:00:00Z',
    },
    {
      id: '00000000-0000-4000-8000-000000000102',
      title: 'Я потратил целый месяц на то чтобы понять как люди успевают всё и вот что я в итоге выяснил',
      body: 'Всегда завидовал людям, которые успевают абсолютно всё: работу, спорт, проекты, отдых, ещё и книжки читают, и при этом выглядят так, будто у них вагон свободного времени. У меня же вечно ощущение, что день пролетел, а я ничего толком не сделал, хотя вроде бы и не сидел без дела. Решил разобраться в этом как следует. Начал следить за своим временем по часам, читать исследования, пробовать разные подходы, менять привычки и записывать результаты.',
      status: 'published',
      published_at: '2026-09-01T12:00:00Z',
    },
    {
      id: '00000000-0000-4000-8000-000000000103',
      title: 'Почему у одних есть а у других нет: разбираю по полочкам без прикрас и пустых обещаний',
      body: 'Размышляю о том, почему постоянная спешка мешает замечать простые вещи и радоваться жизни.',
      status: 'published',
      published_at: '2026-09-01T12:00:00Z',
    },
    {
      id: '00000000-0000-4000-8000-000000000104',
      title: 'Я год наблюдал за людьми которые бросили работу ради своего дела и вот с ними что произошло',
      body: 'Всегда завидовал людям, которые успевают абсолютно всё: работу, спорт, проекты, отдых, ещё и книжки читают, и при этом выглядят так, будто у них вагон свободного времени. У меня же вечно ощущение, что день пролетел, а я ничего толком не сделал, хотя вроде бы и не сидел без дела. Решил разобраться в этом как следует. Начал следить за своим временем по часам, читать исследования, пробовать разные подходы, менять привычки и записывать результаты.',
      status: 'published',
      published_at: '2026-09-01T12:00:00Z',
    },
    {
      id: '00000000-0000-4000-8000-000000000105',
      title: 'Я специально неделю прожил без телефона и соцсетей чтобы понять как это влияет на повседневную жизнь',
      body: 'Неделя без телефона помогла мне обратить внимание на своё время и привычки.',
      status: 'published',
      published_at: '2026-09-01T12:00:00Z',
    },
    {
      id: '00000000-0000-4000-8000-000000000106',
      title: 'Я расспросил десять человек которые резко поменяли профессию в тридцать лет и вот что узнал',
      body: 'Истории людей, которые решились изменить профессию и начать новую главу своей жизни.',
      status: 'published',
      published_at: '2026-09-01T12:00:00Z',
    },
    {
      id: '00000000-0000-4000-8000-000000000107',
      title: 'Идеи для следующего поста',
      body: 'Этот черновик не должен попадать в сетку и счётчик опубликованных постов.',
      status: 'draft',
    },
  ],
};

const EMPTY_POSTS_RESPONSE = { user_id: PROFILE_RESPONSE.user.id, posts: [] };

const PRESENTATION = {
  avatarUrl: '/assets/profile/avatar.png',
  posts: {
    '00000000-0000-4000-8000-000000000101': {
      likes: 12, comments: 3,
      imageUrl: '/assets/profile/post-money.png',
      imageAlt: 'Превью поста о заработке: «Откуда у них деньги»',
    },
    '00000000-0000-4000-8000-000000000102': { likes: 12, comments: 3 },
    '00000000-0000-4000-8000-000000000103': {
      likes: 12, comments: 3,
      imageUrl: '/assets/profile/post-life.png',
      imageAlt: 'Превью поста: «Перестаньте гнаться за жизнью»',
    },
    '00000000-0000-4000-8000-000000000104': { likes: 12, comments: 3 },
    '00000000-0000-4000-8000-000000000105': {
      likes: 12, comments: 3,
      imageUrl: '/assets/profile/post-phone.png',
      imageAlt: 'Превью поста о неделе без телефона',
    },
    '00000000-0000-4000-8000-000000000106': {
      likes: 12, comments: 3,
      imageUrl: '/assets/profile/post-career.png',
      imageAlt: 'Превью поста о смене профессии',
    },
  },
};

const MOCK_REFERENCE_TIME = new Date('2026-09-01T21:00:00Z');

/**
 * Готовит профиль и посты для шаблона.
 * @param {Object} profileResponse - Данные пользователя.
 * @param {Object} postsResponse - Данные постов.
 * @param {Object} presentation - Картинки и счётчики.
 * @param {Date} referenceTime - Время для сравнения дат.
 * @returns {Object} Данные для шаблона.
 */
export function buildProfileViewModel(profileResponse, postsResponse, presentation, referenceTime) {
  const posts = postsResponse.posts.filter((post) => post.status === 'published').map((post) => {
    const details = presentation.posts[post.id] ?? {};
    const publishedAt = post.published_at ?? '';
    return {
      id: post.id,
      title: post.title,
      body: post.body,
      imageUrl: details.imageUrl ?? '',
      imageAlt: details.imageAlt ?? '',
      likes: details.likes ?? 0,
      comments: details.comments ?? 0,
      publishedAt,
      publishedAtLabel: formatPublishedAt(publishedAt, referenceTime),
    };
  });
  return {
    name: profileResponse.user.nickname,
    username: `@${profileResponse.user.username}`,
    bio: profileResponse.author.bio,
    avatarUrl: presentation.avatarUrl,
    postCount: posts.length,
    postCountLabel: formatPostCount(posts.length),
    hasPosts: posts.length > 0,
    posts,
  };
}

/**
 * Возвращает HTML профиля.
 * @returns {string} HTML страницы профиля.
 */
export function renderProfile() {
  const state = new URLSearchParams(window.location.search).get('state');
  const postsResponse = state === 'own-author-empty' ? EMPTY_POSTS_RESPONSE : POSTS_RESPONSE;
  const data = buildProfileViewModel(PROFILE_RESPONSE, postsResponse, PRESENTATION, MOCK_REFERENCE_TIME);
  return render('pages/profile/profile', data);
}
