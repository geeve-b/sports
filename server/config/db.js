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

export async function disconnectDB() {
  await mongoose.disconnect();
  if (memoryServer) await memoryServer.stop();
}
