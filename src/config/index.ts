import { logger } from '../utils/logger';

export const config = {
  port: process.env.PORT || 3001,
  databasePath: process.env.DATABASE_PATH || './database/app.db',
  jwtSecret: process.env.JWT_SECRET || 'youtube-tv-secret-key',
  encryptionKey: process.env.ENCRYPTION_KEY || 'youtube-tv-encryption-key',
  frontendUrl: process.env.FRONTEND_URL || 'http://localhost:5173',
  cookiesPath: process.env.COOKIES_PATH || './cookies.txt',
  subscriptionsPath: process.env.SUBSCRIPTIONS_PATH || './subscriptions.json'
};

logger.info('YouTube TV Configuration:', {
  port: config.port,
  database: config.databasePath
});
