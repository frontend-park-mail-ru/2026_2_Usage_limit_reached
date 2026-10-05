import { required, minLength, maxLength, maxByteLength, pattern, email, sameAs } from './rules.js';

/**
 * Схема валидации
 * @typedef {Object<string, Rule[]>} Schema
 */

const EMAIL_MAX = 254;
const USERNAME_MIN = 3;
const USERNAME_MAX = 32;
const NICKNAME_MAX = 64;
const PASSWORD_MIN = 8;
const PASSWORD_MAX = 64;
const PASSWORD_MAX_BYTES = 72;

/**
 * Схема формы логина.
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
    maxLength(EMAIL_MAX, 'Максимальная длина адреса электронной почты — 254 символа'),
    email,
  ],
  username: [
    required('Введите имя пользователя'),
    minLength(USERNAME_MIN, 'Минимальная длина имени пользователя — 3 символа'),
    maxLength(USERNAME_MAX, 'Максимальная длина имени пользователя — 32 символа'),
    pattern(/^[a-zA-Z0-9_]+$/, 'Только латинские буквы, цифры и _'),
  ],
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
