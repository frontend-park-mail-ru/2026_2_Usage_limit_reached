/**
 * @file Схемы валидации форм.
 * Схема описывает, какие правила применяются к каждому полю формы.
 * Ключ схемы совпадает с атрибутом name у поля ввода.
 */

import { required, minLength, maxLength, pattern, email, sameAs } from './rules.js';

/**
 * Схема валидации: имя поля → список правил.
 * Правила проверяются по порядку, пользователю показывается первая ошибка,
 * поэтому required всегда должен идти первым.
 * @typedef {Object<string, import('./rules.js').Rule[]>} Schema
 */

/** Максимальная длина email. */
const EMAIL_MAX = 254;
/** Минимальная длина имени пользователя. */
const USERNAME_MIN = 3;
/** Максимальная длина имени пользователя. */
const USERNAME_MAX = 32;
/** Максимальная длина отображаемого имени. */
const NICKNAME_MAX = 64;
/** Минимальная длина пароля. */
const PASSWORD_MIN = 8;
/** Максимальная длина пароля. Защищает от вставки слишком длинных строк. */
const PASSWORD_MAX = 64;

/**
 * Схема формы логина.
 * Проверяется только заполненность: поле login принимает и username, и email,
 * а правильность пары логин/пароль проверяет сервер.
 * Поля формы: login, password.
 * @type {Schema}
 */
export const loginSchema = {
  login: [required('Введите адрес электронной почты или имя пользователя')],
  password: [required('Введите пароль')],
};

/**
 * Схема формы регистрации.
 * Поля формы: email, username, nickname, password, passwordRepeat.
 * @type {Schema}
 */
export const registerSchema = {
  email: [
    required('Введите адрес электронной почты'),
    maxLength(EMAIL_MAX, 'Слишком длинный адрес электронной почты'),
    email,
  ],
  username: [
    required('Введите имя пользователя'),
    minLength(USERNAME_MIN, 'Имя пользователя должно быть не короче 3 символов'),
    maxLength(USERNAME_MAX, 'Имя пользователя должно быть не длиннее 32 символов'),
    pattern(/^[a-zA-Z0-9_]+$/, 'Только латинские буквы, цифры и _'),
  ],
  nickname: [
    required('Введите отображаемое имя'),
    maxLength(NICKNAME_MAX, 'Отображаемое имя должно быть не длиннее 64 символов'),
    pattern(/^[\p{L}\d _]+$/u, 'Только буквы, цифры, пробел и _'),
  ],
  password: [
    required('Введите пароль'),
    minLength(PASSWORD_MIN, 'Пароль должен быть не короче 8 символов'),
    maxLength(PASSWORD_MAX, 'Пароль должен быть не длиннее 64 символов'),
    pattern(/[a-zA-Z]/, 'Пароль должен содержать хотя бы одну латинскую букву'),
    pattern(/\d/, 'Пароль должен содержать хотя бы одну цифру'),
  ],
  passwordRepeat: [
    required('Повторите пароль'),
    sameAs('password', 'Пароли не совпадают'),
  ],
};
