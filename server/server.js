/**
 * @file Сервер для разработки: отдаёт файлы фронтенда,
 * а на любой другой путь отдаёт index.html, чтобы работал роутер SPA.
 * Запуск: npm.cmd start.
 */

import express from 'express';
import path from 'node:path';

/** Порт сервера. CORS бэкенда настроен на адрес http://localhost:3000. */
const PORT = 3000;

/** Корень проекта: папка на уровень выше server/. */
const ROOT_DIR = path.join(import.meta.dirname, '..');

/** Папка с кодом фронтенда: index.html, main.js, стили, templates.js. */
const SRC_DIR = path.join(ROOT_DIR, 'src');

/** Рантайм Handlebars из пакета: выполняет прекомпилированные шаблоны. */
const HANDLEBARS_RUNTIME = path.join(ROOT_DIR, 'node_modules', 'handlebars', 'dist', 'handlebars.runtime.min.js');

const app = express();

app.use(express.static(SRC_DIR));

app.get('/vendor/handlebars.runtime.min.js', (req, res) => {
  res.sendFile(HANDLEBARS_RUNTIME);
});

app.use((req, res) => {
  res.sendFile(path.join(SRC_DIR, 'index.html'));
});

app.listen(PORT, () => {
  console.log(`Сервер запущен: http://localhost:${PORT}`);
});
