import mongoose from 'mongoose';
import { env } from './env.js';

let memoryServer = null;

export async function connectDB() {
  let uri = env.mongoUri;

  if (env.useMemoryDb) {
    const { MongoMemoryServer } = await import('mongodb-memory-server');
    memoryServer = await MongoMemoryServer.create();
    uri = memoryServer.getUri('wildplay');
  }

  if (!uri) {
    throw new Error(
      'MONGO_URI is not set. Add it to server/.env, or run `npm run demo` to use an in-memory database.',
    );
  }

  mongoose.set('strictQuery', true);
  await mongoose.connect(uri);
  return { memory: Boolean(memoryServer) };
}

// Serverless (Vercel) imports app.js without running server.js, so connect on first use and reuse
// the connection while the function instance stays warm.
let connecting = null;
export function ensureDB() {
  if (mongoose.connection.readyState === 1) return Promise.resolve();
  connecting ??= connectDB().catch((err) => {
    connecting = null;
    throw err;
  });
  return connecting;
}

export async function disconnectDB() {
  await mongoose.disconnect();
  if (memoryServer) await memoryServer.stop();
}
