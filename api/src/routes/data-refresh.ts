import { Router, Response } from 'express';
import { authenticateUser } from '../middleware/auth';
import { dataRefreshService } from '../services/data-refresh';
import { AuthRequest } from '../types';
import { getDb } from '../services/database';

const router = Router();

// Get current refresh status
router.get('/status', authenticateUser, (_req, res) => {
  res.json({
    isRunning: dataRefreshService.isRefreshing(),
    progress: dataRefreshService.getProgress()
  });
});

// Clear video cache and timelines
router.post('/clear-cache', authenticateUser, async (_req, res) => {
  try {
    const db = await getDb();
    await db.run('DELETE FROM video_cache');
    await db.run('DELETE FROM timelines');

    // Also clear in-memory cache
    const { cacheManager } = await import('../services/cache-manager');
    cacheManager.clearCache();

    res.json({ message: 'Cache cleared successfully' });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Full refresh: clear cache then start data refresh
router.post('/full-refresh', authenticateUser, async (req, res) => {
  try {
    if (dataRefreshService.isRefreshing()) {
      return res.status(400).json({ error: 'Refresh already in progress' });
    }

    const { browser = 'chrome', videosPerChannel = 10 } = req.body;

    // Clear cache first
    const db = await getDb();
    await db.run('DELETE FROM video_cache');
    await db.run('DELETE FROM timelines');

    const { cacheManager } = await import('../services/cache-manager');
    cacheManager.clearCache();

    // Start refresh in background
    dataRefreshService.startRefresh(browser, videosPerChannel).catch(error => {
      console.error('Refresh error:', error);
    });

    return res.json({
      message: 'Cache cleared, data refresh started',
      status: dataRefreshService.getProgress()
    });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

// Start data refresh
router.post('/start', authenticateUser, async (req, res) => {
  try {
    if (dataRefreshService.isRefreshing()) {
      return res.status(400).json({ error: 'Refresh already in progress' });
    }

    const { browser = 'chrome', videosPerChannel = 50 } = req.body;

    // Start refresh in background
    dataRefreshService.startRefresh(browser, videosPerChannel).catch(error => {
      console.error('Refresh error:', error);
    });

    return res.json({ 
      message: 'Data refresh started',
      status: dataRefreshService.getProgress()
    });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

// Server-Sent Events endpoint for real-time progress
router.get('/progress', (req: AuthRequest, res: Response) => {
  // For SSE, we need to handle auth differently since headers are limited
  const token = req.query.token as string;
  
  if (!token) {
    res.status(401).json({ error: 'No token provided' });
    return;
  }

  // Simple validation - in production, verify JWT properly
  // For now, just check token exists since we're auto-logging in
  
  // Set headers for SSE
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('Access-Control-Allow-Origin', '*');

  // Send initial status
  res.write(`data: ${JSON.stringify(dataRefreshService.getProgress())}\n\n`);

  // Listen for progress updates
  const progressHandler = (progress: any) => {
    res.write(`data: ${JSON.stringify(progress)}\n\n`);
  };

  dataRefreshService.on('progress', progressHandler);

  // Clean up on client disconnect
  req.on('close', () => {
    dataRefreshService.removeListener('progress', progressHandler);
    res.end();
  });
});

export default router;