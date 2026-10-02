/**
 * @file Настройки модуля API: адрес бэкенда.
 * Адрес берётся из переменной окружения VITE_API_URL,
 * а если её нет, используется адрес бэка при локальном запуске.
 */

/** Адрес бэкенда по умолчанию: так бэк запускается локально. */
const DEFAULT_API_BASE_URL = 'http://localhost:8080';

/**
 * Адрес бэкенда без слеша в конце, например http://localhost:8080.
 * К нему приклеиваются пути запросов: API_BASE_URL + '/login'.
 * @type {string}
 */
export const API_BASE_URL = (import.meta.env.VITE_API_URL || DEFAULT_API_BASE_URL).replace(/\/+$/, '');
