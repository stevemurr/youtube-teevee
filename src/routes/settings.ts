import { Hono } from 'hono';
import { authenticateUser } from '../middleware/auth';
import { getDb } from '../services/database';
import type { HonoEnv } from '../types';

const router = new Hono<HonoEnv>();

router.get('/', authenticateUser, (c) => {
  return c.json(c.get('user').settings);
});

router.put('/', authenticateUser, async (c) => {
  const user = c.get('user');
  const settings = await c.req.json();

  getDb()
    .query('UPDATE users SET settings = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?')
    .run(JSON.stringify(settings), user.id);

  return c.json(settings);
});

export default router;
