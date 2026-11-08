import express from 'express';
import cors from 'cors';
import compression from 'compression';
import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { config } from './config.js';
import { pool } from './db.js';
import { ApiError } from './errors.js';
import { errorHandler } from './middleware/errors.js';
import authRouter from './routes/auth.js';
import membersRouter from './routes/members.js';
import eventsRouter from './routes/events.js';
import analysisRouter from './routes/analysis.js';
import { listWithAuthors } from './controllers/events.js';

export const app = express();
app.disable('x-powered-by');
app.use(compression());
app.use(cors((req, callback) => {
  const origin = req.get('Origin');
  const ownOrigin = `${req.protocol}://${req.get('host')}`;
  if (origin && !config.origins.includes(origin) && origin !== ownOrigin) return callback(new ApiError(403, 'FORBIDDEN', '허용되지 않은 접속 주소입니다.'));
  callback(null, { origin: origin || false, credentials: true });
}));
app.use(express.json({ limit: '32kb' }));
app.use('/api', (req, res, next) => {
  if (['POST', 'PATCH', 'PUT', 'DELETE'].includes(req.method)) {
    const origin = req.get('Origin');
    const ownOrigin = `${req.protocol}://${req.get('host')}`;
    if (origin && !config.origins.includes(origin) && origin !== ownOrigin) throw new ApiError(403, 'FORBIDDEN', '허용되지 않은 요청 출처입니다.');
  }
  next();
});
app.get('/api/health', async (req, res) => {
  await pool.execute('SELECT 1');
  res.json({ data: { status: 'ok', database: process.env.DB_NAME } });
});
app.use('/api/auth', authRouter);
app.use('/api/members', membersRouter);
app.use('/api/events', eventsRouter);
app.get('/api/events-with-authors', listWithAuthors);
app.use('/api/analysis-records', analysisRouter);
app.use('/api', (req, res, next) => next(new ApiError(404, 'NOT_FOUND', 'API 경로를 찾을 수 없습니다.')));

// Vite build is served by this Express app; there are no framework API routes.
const clientDirectory = fileURLToPath(new URL('../client/dist/', import.meta.url));
if (existsSync(`${clientDirectory}index.html`)) {
  app.get(/^\/events\/(\d+)\/?$/, (req, res) => res.redirect(302, `/events/detail/?id=${req.params[0]}`));
  app.use(express.static(clientDirectory, {
    setHeaders(res, path) {
      if (path.replaceAll('\\', '/').includes('/assets/')) res.set('Cache-Control', 'public, max-age=31536000, immutable');
    },
  }));
  const knownPage = /^\/(?:events(?:\/detail)?|analysis|joined|sources|mypage|login|signup)?\/?$/;
  app.get(/.*/, (req, res, next) => {
    if (req.path.startsWith('/assets/') || /\.[a-z0-9]+$/i.test(req.path)) return next();
    res.status(knownPage.test(req.path) ? 200 : 404).sendFile('index.html', { root: clientDirectory });
  });
} else {
  app.get('/', (req, res) => res.json({ data: { service: 'Gotham Express API', frontend: 'Vite http://localhost:5173 또는 npm run build 후 npm start' } }));
}
app.use((req, res, next) => next(new ApiError(404, 'NOT_FOUND', '요청한 경로를 찾을 수 없습니다.')));
app.use(errorHandler);
