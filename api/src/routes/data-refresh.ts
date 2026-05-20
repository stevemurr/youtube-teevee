import { Router, Response } from 'express';
import { authenticateUser } from '../middleware/auth';
import { dataRefreshService } from '../services/data-refresh';
import { AuthRequest } from '../types';
import { getDb } from '../services/database';
import { ok, fail } from '../utils/response';
import { logger } from '../utils/logger';

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

    const { cacheManager } = await import('../services/cache-manager');
    cacheManager.clearCache();

    ok(res, { message: 'Cache cleared successfully' });
  } catch (error: any) {
    fail(res, 500, error.message);
  }
});

// Full refresh: clear cache then start data refresh
router.post('/full-refresh', authenticateUser, async (req, res) => {
  try {
    if (dataRefreshService.isRefreshing()) {
      return fail(res, 400, 'Refresh already in progress');
    }

    const { browser = 'chrome', videosPerChannel = 10 } = req.body;

    const db = await getDb();
    await db.run('DELETE FROM video_cache');
    await db.run('DELETE FROM timelines');

    const { cacheManager } = await import('../services/cache-manager');
    cacheManager.clearCache();

    dataRefreshService.startRefresh(browser, videosPerChannel).catch(error => {
      logger.error('Refresh error:', error);
    });

    return ok(res, {
      message: 'Cache cleared, data refresh started',
      status: dataRefreshService.getProgress()
    });
  } catch (error: any) {
    return fail(res, 500, error.message);
  }
});

// Start data refresh
router.post('/start', authenticateUser, async (req, res) => {
  try {
    if (dataRefreshService.isRefreshing()) {
      return fail(res, 400, 'Refresh already in progress');
    }

    const { browser = 'chrome', videosPerChannel = 50 } = req.body;

    dataRefreshService.startRefresh(browser, videosPerChannel).catch(error => {
      logger.error('Refresh error:', error);
    });

    return ok(res, {
      message: 'Data refresh started',
      status: dataRefreshService.getProgress()
    });
  } catch (error: any) {
    return fail(res, 500, error.message);
  }
});

// Server-Sent Events endpoint for real-time progress
router.get('/progress', (req: AuthRequest, res: Response) => {
  const token = req.query.token as string;

  if (!token) {
    fail(res, 401, 'No token provided');
    return;
  }

  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('Access-Control-Allow-Origin', '*');

  res.write(`data: ${JSON.stringify(dataRefreshService.getProgress())}\n\n`);

  const progressHandler = (progress: any) => {
    res.write(`data: ${JSON.stringify(progress)}\n\n`);
  };

  dataRefreshService.on('progress', progressHandler);

  req.on('close', () => {
    dataRefreshService.removeListener('progress', progressHandler);
    res.end();
  });
});

export default router;
