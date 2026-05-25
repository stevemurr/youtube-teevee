import { Hono } from 'hono';
import { z } from 'zod';
import { authenticateUser } from '../middleware/auth';
import { timelineGenerator } from '../services/timeline-generator';
import { cacheManager } from '../services/cache-manager';
import { getDb } from '../services/database';
import { fail } from '../utils/response';
import { logger } from '../utils/logger';
import type { HonoEnv } from '../types';

const router = new Hono<HonoEnv>();

const CurrentProgramQuery = z.object({
  channelId: z.string().min(1, 'Channel ID required'),
  localHour: z.coerce.number().int().min(0).max(23).optional(),
  localMinute: z.coerce.number().int().min(0).max(59).optional(),
  localSecond: z.coerce.number().int().min(0).max(59).optional(),
});

router.get('/current', authenticateUser, async (c) => {
  try {
    const user = c.get('user');
    const today = new Date().toISOString().split('T')[0];

    const timeline = await timelineGenerator.generateTimeline(
      user.id.toString(),
      today,
      user.settings
    );

    return c.json({ date: today, timeline });
  } catch (error) {
    logger.error('Error fetching timeline:', error);
    return fail(c, 500, 'Failed to fetch timeline');
  }
});

router.get('/current-program', authenticateUser, async (c) => {
  try {
    const user = c.get('user');

    const parsed = CurrentProgramQuery.safeParse(c.req.query());
    if (!parsed.success) {
      return fail(c, 400, parsed.error.issues[0].message);
    }

    const { channelId, localHour, localMinute, localSecond } = parsed.data;

    const now = new Date();
    const hour = localHour ?? now.getHours();
    const minute = localMinute ?? now.getMinutes();
    const second = localSecond ?? now.getSeconds();
    const currentSeconds = hour * 3600 + minute * 60 + second;

    const result = await timelineGenerator.getCurrentProgramBySeconds(
      user.id.toString(),
      channelId,
      currentSeconds
    );

    return c.json(result);
  } catch (error) {
    logger.error('Error fetching current program:', error);
    return fail(c, 500, 'Failed to fetch current program');
  }
});

router.post('/regenerate', authenticateUser, async (c) => {
  try {
    const user = c.get('user');
    const body = await c.req.json().catch(() => ({}));
    const targetDate = body.date || new Date().toISOString().split('T')[0];

    cacheManager.clearCache();

    const db = getDb();
    db.query('DELETE FROM timelines WHERE user_id = ? AND date = ?').run(user.id, targetDate);

    const timeline = await timelineGenerator.generateTimeline(
      user.id.toString(),
      targetDate,
      user.settings,
      true
    );

    return c.json({ date: targetDate, timeline });
  } catch (error) {
    logger.error('Error regenerating timeline:', error);
    return fail(c, 500, 'Failed to regenerate timeline');
  }
});

export default router;
