import { Router, Response } from 'express';
import { z } from 'zod';
import { authenticateUser } from '../middleware/auth';
import { timelineGenerator } from '../services/timeline-generator';
import { AuthRequest } from '../types';
import { fail } from '../utils/response';
import { logger } from '../utils/logger';

const router = Router();

const authMiddleware = authenticateUser;

const CurrentProgramQuery = z.object({
  channelId: z.string().min(1, 'Channel ID required'),
  localHour: z.coerce.number().int().min(0).max(23).optional(),
  localMinute: z.coerce.number().int().min(0).max(59).optional(),
  localSecond: z.coerce.number().int().min(0).max(59).optional(),
});

// Get current day's timeline
router.get('/current', authMiddleware, async (req, res) => {
  try {
    const user = (req as AuthRequest).user!;
    const today = new Date().toISOString().split('T')[0];

    const timeline = await timelineGenerator.generateTimeline(
      user.id.toString(),
      today,
      user.settings
    );

    res.json({ date: today, timeline });
  } catch (error) {
    logger.error('Error fetching timeline:', error);
    fail(res, 500, 'Failed to fetch timeline');
  }
});

// Get what's playing now on a specific channel
router.get('/current-program', authMiddleware, async (req, res): Promise<Response> => {
  try {
    const user = (req as AuthRequest).user!;

    const parsed = CurrentProgramQuery.safeParse(req.query);
    if (!parsed.success) {
      return fail(res, 400, parsed.error.issues[0].message);
    }

    const { channelId, localHour, localMinute, localSecond } = parsed.data;

    // Use local time components from frontend to avoid timezone issues
    // (Docker runs in UTC but user's browser uses local time)
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

    return res.json(result);
  } catch (error) {
    logger.error('Error fetching current program:', error);
    return fail(res, 500, 'Failed to fetch current program');
  }
});

// Force timeline regeneration
router.post('/regenerate', authMiddleware, async (req, res) => {
  try {
    const user = (req as AuthRequest).user!;
    const { date } = req.body;
    const targetDate = date || new Date().toISOString().split('T')[0];

    const { cacheManager } = await import('../services/cache-manager');
    const { getDb } = await import('../services/database');

    cacheManager.clearCache();

    const db = await getDb();
    await db.run(
      'DELETE FROM timelines WHERE user_id = ? AND date = ?',
      [user.id, targetDate]
    );

    const timeline = await timelineGenerator.generateTimeline(
      user.id.toString(),
      targetDate,
      user.settings,
      true
    );

    res.json({ date: targetDate, timeline });
  } catch (error) {
    logger.error('Error regenerating timeline:', error);
    fail(res, 500, 'Failed to regenerate timeline');
  }
});

export default router;
