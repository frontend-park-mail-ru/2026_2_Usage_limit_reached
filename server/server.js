import express from 'express';
import path from 'node:path';

const PORT = Number(process.env.PORT || 3000);

const DIST_DIR = path.join(import.meta.dirname, '..', 'dist');

const app = express();

app.use(express.static(DIST_DIR));

app.use((req, res) => {
  res.sendFile(path.join(DIST_DIR, 'index.html'));
});

app.listen(PORT, () => {
  console.log(`Сервер запущен: http://localhost:${PORT}`);
});
