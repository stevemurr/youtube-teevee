import { Hono } from 'hono';
import { streamSSE } from 'hono/streaming';
import { authenticateUser } from '../middleware/auth';
import { dataRefreshService } from '../services/data-refresh';
import { getDb } from '../services/database';
import { cacheManager } from '../services/cache-manager';
import { ok, fail } from '../utils/response';
import { logger } from '../utils/logger';
import type { HonoEnv } from '../types';

const router = new Hono<HonoEnv>();

router.get('/status', authenticateUser, (c) =>
  c.json({
    isRunning: dataRefreshService.isRefreshing(),
    progress: dataRefreshService.getProgress(),
  })
);

router.get('/cookies-status', authenticateUser, async (c) => {
  const setup = await dataRefreshService.isSetupComplete();
  return ok(c, { exists: setup.cookies && setup.subscriptions, ...setup });
});

router.post('/clear-cache', authenticateUser, (c) => {
  const db = getDb();
  db.query('DELETE FROM video_cache').run();
  db.query('DELETE FROM timelines').run();
  cacheManager.clearCache();
  return ok(c, { message: 'Cache cleared successfully' });
});

router.post('/full-refresh', authenticateUser, (c) => {
  if (dataRefreshService.isRefreshing()) fail(400, 'Refresh already in progress');

  const db = getDb();
  db.query('DELETE FROM video_cache').run();
  db.query('DELETE FROM timelines').run();
  cacheManager.clearCache();

  dataRefreshService.startRefresh().catch((error) => {
    logger.error('Refresh error:', error);
  });

  return ok(c, {
    message: 'Cache cleared, data refresh started',
    status: dataRefreshService.getProgress(),
  });
});

router.post('/start', authenticateUser, async (c) => {
  if (dataRefreshService.isRefreshing()) fail(400, 'Refresh already in progress');

  const body = await c.req.json().catch(() => ({}));
  const { videosPerChannel = 50 } = body;

  dataRefreshService.startRefresh(videosPerChannel).catch((error) => {
    logger.error('Refresh error:', error);
  });

  return ok(c, {
    message: 'Data refresh started',
    status: dataRefreshService.getProgress(),
  });
});

router.get('/progress', (c) => {
  const token = c.req.query('token');
  if (!token) return c.json({ error: 'No token provided' }, 401);

  return streamSSE(c, async (stream) => {
    await stream.writeSSE({ data: JSON.stringify(dataRefreshService.getProgress()) });

    await new Promise<void>((resolve) => {
      const handler = async (progress: any) => {
        try {
          await stream.writeSSE({ data: JSON.stringify(progress) });
        } catch {
          resolve();
        }
      };

      dataRefreshService.on('progress', handler);
      stream.onAbort(() => {
        dataRefreshService.removeListener('progress', handler);
        resolve();
      });
    });
  });
});

export default router;
