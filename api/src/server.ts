import express from 'express';
import cors from 'cors';
import { initDatabase } from './services/database';
import { config } from './config';

// Import routes
import authRoutes from './routes/auth';
import channelRoutes from './routes/channels';
import timelineRoutes from './routes/timeline';
import settingsRoutes from './routes/settings';
import dataRefreshRoutes from './routes/data-refresh';

const app = express();
const PORT = config.port;

// Middleware
app.use(cors());
app.use(express.json());

// No rate limiting needed for local-only app

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/channels', channelRoutes);
app.use('/api/timeline', timelineRoutes);
app.use('/api/settings', settingsRoutes);
app.use('/api/data-refresh', dataRefreshRoutes);

// Health check
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Error handling middleware
app.use((err: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Something went wrong!' });
});

// Start server
async function startServer() {
  try {
    // Initialize database
    await initDatabase();
    console.log('Database initialized');
    
    // Log environment status
    console.log('Server Configuration:');
    console.log('- Database:', config.databasePath);
    console.log('- Port:', config.port);
    
    app.listen(PORT, () => {
      console.log(`Server running on http://localhost:${PORT}`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

// Only start server if this file is being run directly
if (require.main === module) {
  startServer();
}

// Export app for production server
export default app;