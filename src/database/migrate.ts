import { initDatabase, closeDatabase } from '../services/database';

async function runMigrations() {
  try {
    console.log('Running database migrations...');
    await initDatabase();
    console.log('Database migrations completed successfully');
    closeDatabase();
    process.exit(0);
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  }
}

runMigrations();
