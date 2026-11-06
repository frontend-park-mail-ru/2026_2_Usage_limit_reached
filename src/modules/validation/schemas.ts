import { required, minLength, maxLength, maxByteLength, minNumber, pattern, email, sameAs, richTextRequired, httpsUrl } from './rules.ts';
import type { Rule, Schema } from './validation.types.ts';
import { EMAIL_MAX, USERNAME_MIN, USERNAME_MAX, NICKNAME_MAX, PASSWORD_MIN, PASSWORD_MAX, PASSWORD_MAX_BYTES, BIO_MAX, POST_TITLE_MAX, POST_BODY_MAX, DONATION_AMOUNT_MIN, DONATION_AMOUNT_MAX_DIGITS, DONATION_MESSAGE_MAX } from './schemas.constants.ts';

const usernameRules: Rule[] = [
  required('Введите имя пользователя'),
  minLength(USERNAME_MIN, 'Минимальная длина имени пользователя — 3 символа'),
  maxLength(USERNAME_MAX, 'Максимальная длина имени пользователя — 32 символа'),
  pattern(/^[a-zA-Z0-9_]+$/, 'Только латинские буквы, цифры и _'),
];

export const loginSchema: Schema = {
  login: [required('Введите адрес электронной почты или имя пользователя')],
  password: [required('Введите пароль')],
};

export const registerSchema: Schema = {
  email: [
    required('Введите адрес электронной почты'),
    maxLength(EMAIL_MAX, 'Максимальная длина адреса электронной почты — 254 символа'),
    email,
  ],
  username: usernameRules,
  nickname: [
    required('Введите отображаемое имя'),
    maxLength(NICKNAME_MAX, 'Максимальная длина отображаемого имени — 64 символа'),
    pattern(/^[\p{L}\d _]+$/u, 'Только буквы, цифры 0–9, пробел и _'),
  ],
  password: [
    required('Введите пароль'),
    minLength(PASSWORD_MIN, 'Минимальная длина пароля — 8 символов'),
    maxLength(PASSWORD_MAX, 'Максимальная длина пароля — 64 символа'),
    maxByteLength(PASSWORD_MAX_BYTES, 'Пароль слишком длинный. Сократите его'),
    pattern(/[a-zA-Z]/, 'Пароль должен содержать хотя бы одну латинскую букву'),
    pattern(/\d/, 'Пароль должен содержать хотя бы одну цифру'),
  ],
  passwordRepeat: [
    required('Повторите пароль'),
    sameAs('password', 'Пароли не совпадают'),
  ],
};

export const userSettingsSchema: Schema = {
  nickname: [
    required('Введите имя'),
    maxLength(NICKNAME_MAX, 'Максимальная длина отображаемого имени — 64 символа'),
  ],
  username: usernameRules,
};

export const authorSettingsSchema: Schema = {
  ...userSettingsSchema,
  category: [required('Укажите категорию контента')],
  bio: [maxLength(BIO_MAX, 'Сократите описание до 200 символов')],
};

export const postSchema: Schema = {
  title: [
    required('Введите заголовок поста'),
    maxLength(POST_TITLE_MAX, 'Максимальная длина заголовка — 255 символов'),
  ],
  body: [
    richTextRequired('Введите текст публикации'),
    maxLength(POST_BODY_MAX, 'Текст слишком длинный. Сократите его'),
  ],
};

export const linkSchema: Schema = {
  text: [required('Введите текст ссылки')],
  url: [httpsUrl('Укажите полный адрес, начинающийся с https://')],
};

export const donationSchema: Schema = {
  amount: [
    required('Введите сумму больше нуля'),
    pattern(/^\d+$/, 'Введите сумму целым числом'),
    maxLength(DONATION_AMOUNT_MAX_DIGITS, 'Слишком большая сумма'),
    minNumber(DONATION_AMOUNT_MIN, 'Введите сумму больше нуля'),
  ],
  message: [maxLength(DONATION_MESSAGE_MAX, 'Максимальная длина сообщения — 200 символов')],
};
