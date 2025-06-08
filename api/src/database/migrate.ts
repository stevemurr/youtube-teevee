import { initDatabase } from '../services/database';

async function runMigrations() {
  try {
    console.log('Running database migrations...');
    
    const db = await initDatabase();
    
    console.log('Database migrations completed successfully');
    
    // Close database connection
    await db.close();
    process.exit(0);
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  }
}

runMigrations();