import path from 'node:path';
import { fileURLToPath } from 'node:url';
import cookieParser from 'cookie-parser';
import cors from 'cors';
import express from 'express';
import helmet from 'helmet';
import morgan from 'morgan';
import { env } from './config/env.js';
import { errorHandler, notFound } from './middleware/error.js';
import adminRoutes from './routes/adminRoutes.js';
import announcementRoutes from './routes/announcementRoutes.js';
import authRoutes from './routes/authRoutes.js';
import availabilityRoutes from './routes/availabilityRoutes.js';
import matchRoutes from './routes/matchRoutes.js';
import playerRoutes from './routes/playerRoutes.js';
import statsRoutes from './routes/statsRoutes.js';
import teamRoutes from './routes/teamRoutes.js';
import trainingRoutes from './routes/trainingRoutes.js';

const app = express();

app.set('trust proxy', 1);
app.disable('x-powered-by');
app.use(
  helmet({
    contentSecurityPolicy: env.isProd
      ? {
          directives: {
            ...helmet.contentSecurityPolicy.getDefaultDirectives(),
            'font-src': ["'self'", 'https://fonts.gstatic.com'],
            'style-src': ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'],
            'img-src': ["'self'", 'data:', 'https:'],
          },
        }
      : false,
  }),
);
app.use(cors({ origin: env.clientOrigins, credentials: true }));
app.use(express.json({ limit: '1mb' }));
app.use(cookieParser());
if (!env.isProd) app.use(morgan('dev'));

app.get('/api/health', (_req, res) => res.json({ ok: true, time: new Date().toISOString() }));
app.use('/api/auth', authRoutes);
app.use('/api/teams', teamRoutes);
app.use('/api/players', playerRoutes);
app.use('/api/matches', matchRoutes);
app.use('/api/stats', statsRoutes);
app.use('/api/training', trainingRoutes);
app.use('/api/availability', availabilityRoutes);
app.use('/api/announcements', announcementRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api', notFound);

// In production the API also serves the built client.
if (env.isProd) {
  const dist = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../client/dist');
  app.use(express.static(dist, { index: false, maxAge: '7d' }));
  app.get('*', (_req, res) => res.sendFile(path.join(dist, 'index.html')));
}

app.use(errorHandler);

export default app;
