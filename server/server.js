import express from 'express';
import path from 'node:path';

const PORT = Number(process.env.PORT || 3000);

const DIST_DIR = path.join(import.meta.dirname, '..', 'dist');

const app = express();

app.use((req, res, next) => {
  res.set('X-Frame-Options', 'DENY');
  next();
});

app.use(express.static(DIST_DIR));

app.use((req, res) => {
  if (req.method !== 'GET' && req.method !== 'HEAD') {
    res.set('Allow', 'GET, HEAD').sendStatus(405);
    return;
  }

  const isResource = path.extname(req.path) !== ''
    || ['/assets/', '/styles/', '/vendor/'].some((prefix) => req.path.startsWith(prefix));

  if (isResource || !req.accepts('html')) {
    res.sendStatus(404);
    return;
  }

  res.sendFile(path.join(DIST_DIR, 'index.html'));
});

app.listen(PORT, () => {
  console.log(`Сервер запущен: http://localhost:${PORT}`);
});
