import { required, minLength, maxLength, maxByteLength, minNumber, pattern, email, sameAs, richTextRequired, httpsUrl } from './rules.ts';
import type { Rule, Schema } from './validation.types.ts';
import { EMAIL_MAX, USERNAME_MIN, USERNAME_MAX, NICKNAME_MAX, PASSWORD_MIN, PASSWORD_MAX, PASSWORD_MAX_BYTES, BIO_MAX, POST_TITLE_MAX, POST_BODY_MAX, DONATION_AMOUNT_MIN, DONATION_AMOUNT_MAX_DIGITS, DONATION_MESSAGE_MAX } from './schemas.constants.ts';

const PASSWORD_REQUIREMENTS_ERROR = `Пароль должен содержать от ${PASSWORD_MIN} до ${PASSWORD_MAX} символов, хотя бы одну латинскую букву и цифру`;

const usernameRules: Rule[] = [
  required('Введите имя пользователя'),
  minLength(USERNAME_MIN, 'От 3 символов'),
  maxLength(USERNAME_MAX, 'До 32 символов'),
  pattern(/^[a-zA-Z0-9_]+$/, 'Только латинские буквы, цифры и _'),
];

export const loginSchema: Schema = {
  login: [required('Введите электронную почту или имя пользователя')],
  password: [required('Введите пароль')],
};

export const registerSchema: Schema = {
  email: [
    required('Введите электронную почту'),
    maxLength(EMAIL_MAX, 'До 254 символов'),
    email,
  ],
  username: usernameRules,
  nickname: [
    required('Введите отображаемое имя'),
    maxLength(NICKNAME_MAX, 'До 64 символов'),
    pattern(/^[\p{L}\d _]+$/u, 'Только буквы, цифры, пробел и _'),
  ],
  password: [
    required(PASSWORD_REQUIREMENTS_ERROR),
    minLength(PASSWORD_MIN, PASSWORD_REQUIREMENTS_ERROR),
    maxLength(PASSWORD_MAX, PASSWORD_REQUIREMENTS_ERROR),
    maxByteLength(PASSWORD_MAX_BYTES, PASSWORD_REQUIREMENTS_ERROR),
    pattern(/[a-zA-Z]/, PASSWORD_REQUIREMENTS_ERROR),
    pattern(/\d/, PASSWORD_REQUIREMENTS_ERROR),
  ],
  passwordRepeat: [
    required('Повторите пароль'),
    sameAs('password', 'Пароли не совпадают'),
  ],
};

export const userSettingsSchema: Schema = {
  nickname: [
    required('Введите отображаемое имя'),
    maxLength(NICKNAME_MAX, 'До 64 символов'),
  ],
};

export const becomeAuthorSchema: Schema = {
  bio: [required('Введите описание деятельности'), maxLength(BIO_MAX, `Сократите описание до ${BIO_MAX} символов`)],
};

const requireBio = required('Введите описание деятельности');

/** Проверяет описание при изменении данных автора. */
export const authorSettingsSchema = (author: { bio: string; category?: string | null }): Schema => ({
  ...userSettingsSchema,
  bio: [
    (bio, values) => bio === author.bio && values?.category === (author.category ?? '') ? null : requireBio(bio),
    maxLength(BIO_MAX, `Сократите описание до ${BIO_MAX} символов`),
  ],
});

export const postSchema: Schema = {
  title: [
    required('Введите заголовок поста'),
    maxLength(POST_TITLE_MAX, 'До 255 символов'),
  ],
  body: [
    richTextRequired('Введите текст публикации'),
    maxLength(POST_BODY_MAX, 'Текст слишком длинный. Сократите его'),
  ],
};

export const linkSchema: Schema = {
  text: [required('Введите текст ссылки')],
  url: [httpsUrl('Ссылка должна начинаться с https://')],
};

export const donationSchema: Schema = {
  amount: [
    required('Введите сумму больше нуля'),
    pattern(/^\d+$/, 'Введите сумму целым числом'),
    maxLength(DONATION_AMOUNT_MAX_DIGITS, 'Слишком большая сумма'),
    minNumber(DONATION_AMOUNT_MIN, 'Введите сумму больше нуля'),
  ],
  message: [maxLength(DONATION_MESSAGE_MAX, 'До 200 символов')],
};
