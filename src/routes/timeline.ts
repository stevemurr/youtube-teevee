import { Hono } from 'hono';
import { z } from 'zod';
import { authenticateUser } from '../middleware/auth';
import { timelineGenerator } from '../services/timeline-generator';
import { cacheManager } from '../services/cache-manager';
import { getDb } from '../services/database';
import { fail } from '../utils/response';
import type { HonoEnv } from '../types';

const router = new Hono<HonoEnv>();

const CurrentProgramQuery = z.object({
  channelId: z.string().min(1, 'Channel ID required'),
  localHour: z.coerce.number().int().min(0).max(23).optional(),
  localMinute: z.coerce.number().int().min(0).max(59).optional(),
  localSecond: z.coerce.number().int().min(0).max(59).optional(),
});

router.get('/current', authenticateUser, async (c) => {
  const user = c.get('user');
  const today = new Date().toISOString().split('T')[0];
  const timeline = await timelineGenerator.generateTimeline(user.id.toString(), today, user.settings);
  return c.json({ date: today, timeline });
});

router.get('/current-program', authenticateUser, async (c) => {
  const user = c.get('user');

  const parsed = CurrentProgramQuery.safeParse(c.req.query());
  if (!parsed.success) fail(400, parsed.error.issues[0].message);

  const { channelId, localHour, localMinute, localSecond } = parsed.data!;
  const now = new Date();
  const currentSeconds =
    (localHour ?? now.getHours()) * 3600 +
    (localMinute ?? now.getMinutes()) * 60 +
    (localSecond ?? now.getSeconds());

  const result = await timelineGenerator.getCurrentProgramBySeconds(
    user.id.toString(),
    channelId,
    currentSeconds
  );

  return c.json(result);
});

router.post('/regenerate', authenticateUser, async (c) => {
  const user = c.get('user');
  const body = await c.req.json().catch(() => ({}));
  const targetDate = body.date || new Date().toISOString().split('T')[0];

  cacheManager.clearCache();
  getDb().query('DELETE FROM timelines WHERE user_id = ? AND date = ?').run(user.id, targetDate);

  const timeline = await timelineGenerator.generateTimeline(
    user.id.toString(),
    targetDate,
    user.settings,
    true
  );

  return c.json({ date: targetDate, timeline });
});

export default router;
