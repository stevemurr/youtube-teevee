import { Hono } from 'hono';
import { authenticateUser } from '../middleware/auth';
import { getDb } from '../services/database';
import { ok, fail } from '../utils/response';
import type { HonoEnv } from '../types';

const router = new Hono<HonoEnv>();

router.get('/', authenticateUser, (c) => {
  const channels = getDb().query(
    `SELECT id, youtube_channel_id, channel_name, thumbnail_url, enabled
     FROM channels
     WHERE user_id = ?
     ORDER BY channel_name`
  ).all(c.get('user').id);

  return c.json(channels);
});

router.put('/:id/toggle', authenticateUser, async (c) => {
  const user = c.get('user');
  const channelId = parseInt(c.req.param('id'));
  const { enabled } = await c.req.json();

  const db = getDb();
  const channel = db.query(
    'SELECT id FROM channels WHERE id = ? AND user_id = ?'
  ).get(channelId, user.id);

  if (!channel) fail(404, 'Channel not found');

  db.query('UPDATE channels SET enabled = ? WHERE id = ?').run(enabled ? 1 : 0, channelId);

  return ok(c);
});

export default router;
