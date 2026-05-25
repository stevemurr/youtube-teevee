import { Hono } from 'hono';
import { authenticateUser } from '../middleware/auth';
import { getDb } from '../services/database';
import { fail } from '../utils/response';
import { logger } from '../utils/logger';
import type { HonoEnv } from '../types';

const router = new Hono<HonoEnv>();

router.get('/', authenticateUser, (c) => {
  try {
    const user = c.get('user');
    return c.json(user.settings);
  } catch (error) {
    logger.error('Error fetching settings:', error);
    return fail(c, 500, 'Failed to fetch settings');
  }
});

router.put('/', authenticateUser, async (c) => {
  try {
    const user = c.get('user');
    const settings = await c.req.json();

    const db = getDb();
    db.query(
      'UPDATE users SET settings = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?'
    ).run(JSON.stringify(settings), user.id);

    return c.json(settings);
  } catch (error) {
    logger.error('Error updating settings:', error);
    return fail(c, 500, 'Failed to update settings');
  }
});

export default router;
