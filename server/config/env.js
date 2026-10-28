import dotenv from 'dotenv';
import { fileURLToPath } from 'node:url';

dotenv.config({ path: fileURLToPath(new URL('../.env', import.meta.url)) });

const DEV_SECRET = 'dev-only-secret-change-me';

export const env = {
  nodeEnv: process.env.NODE_ENV || 'development',
  port: Number(process.env.PORT) || 5050,
  mongoUri: process.env.MONGO_URI || '',
  jwtSecret: process.env.JWT_SECRET || DEV_SECRET,
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '7d',
  clientOrigins: (process.env.CLIENT_ORIGIN || 'http://localhost:5173')
    .split(',')
    .map((o) => o.trim())
    .filter(Boolean),
  // `node server.js --memory` runs on a throwaway in-memory MongoDB, seeded on boot.
  useMemoryDb: process.argv.includes('--memory') || process.env.USE_MEMORY_DB === 'true',
};

env.isProd = env.nodeEnv === 'production';

if (env.isProd && env.jwtSecret === DEV_SECRET) {
  throw new Error('JWT_SECRET must be set in production.');
}
