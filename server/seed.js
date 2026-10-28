// Wipes the database in MONGO_URI and loads the demo club.
//   npm run seed
import { connectDB, disconnectDB } from './config/db.js';
import { DEMO_LOGINS, seedDatabase } from './utils/seedData.js';

try {
  await connectDB();
  const summary = await seedDatabase({ log: console.log });
  console.log('\nSeeded:', summary);
  console.log(`Demo password for every account: ${DEMO_LOGINS.password}`);
  for (const [role, email] of Object.entries(DEMO_LOGINS.accounts)) console.log(`  ${role.padEnd(8)} ${email}`);
} catch (err) {
  console.error('Seeding failed:', err.message);
  process.exitCode = 1;
} finally {
  await disconnectDB();
}
