import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Configuration for the application
export const config = {
  // Server config
  port: process.env.PORT || 3001,
  
  // Database
  databasePath: process.env.DATABASE_PATH || './database/app.db',
  
  // JWT & Encryption
  jwtSecret: process.env.JWT_SECRET || 'youtube-tv-secret-key',
  encryptionKey: process.env.ENCRYPTION_KEY || 'youtube-tv-encryption-key',
  
  // Frontend URL
  frontendUrl: process.env.FRONTEND_URL || 'http://localhost:5173'
};

console.log('YouTube TV Configuration:', {
  port: config.port,
  database: config.databasePath
});