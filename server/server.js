import express from 'express';
import path from 'node:path';

const PORT = Number(process.env.PORT || 3000);

const ROOT_DIR = path.join(import.meta.dirname, '..');

const SRC_DIR = path.join(ROOT_DIR, 'src');

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
