import app from './app.js';
import { connectDB, disconnectDB } from './config/db.js';
import { env } from './config/env.js';
import { DEMO_LOGINS, seedDatabase } from './utils/seedData.js';

async function start() {
  const { memory } = await connectDB();

  if (memory) {
    await seedDatabase();
    console.log('\n  In-memory database seeded. Data resets when the server stops.');
    console.log('  Demo logins (password for all: %s):', DEMO_LOGINS.password);
    for (const [role, email] of Object.entries(DEMO_LOGINS.accounts)) console.log(`    ${role.padEnd(8)} ${email}`);
  }

  const server = app.listen(env.port, () => {
    console.log(`\n  Wildplay API on http://localhost:${env.port}/api\n`);
  });

  const shutdown = async () => {
    server.close();
    await disconnectDB();
    process.exit(0);
  };
  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
}

start().catch((err) => {
  console.error('\n  Wildplay API failed to start:', err.message, '\n');
  process.exit(1);
});
