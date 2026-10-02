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

/** Минимальная длина имени пользователя. */
const USERNAME_MIN = 3;
/** Максимальная длина имени пользователя. */
const USERNAME_MAX = 32;
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
  login: [required('Введите логин или email')],
  password: [required('Введите пароль')],
};

/**
 * Схема формы регистрации.
 * Поля формы: username, email, password, passwordRepeat.
 * @type {Schema}
 */
export const registerSchema = {
  username: [
    required('Введите имя пользователя'),
    minLength(USERNAME_MIN),
    maxLength(USERNAME_MAX),
    pattern(/^[a-zA-Z0-9_]+$/, 'Только латинские буквы, цифры и _'),
  ],
  email: [
    required('Введите email'),
    email,
  ],
  password: [
    required('Введите пароль'),
    minLength(PASSWORD_MIN),
    maxLength(PASSWORD_MAX),
    pattern(/[a-zA-Z]/, 'Пароль должен содержать хотя бы одну латинскую букву'),
    pattern(/\d/, 'Пароль должен содержать хотя бы одну цифру'),
  ],
  passwordRepeat: [
    required('Повторите пароль'),
    sameAs('password', 'Пароли не совпадают'),
  ],
};
