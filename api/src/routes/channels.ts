import { Router, Response } from 'express';
import { authenticateUser } from '../middleware/auth';
import { getDb } from '../services/database';
import { AuthRequest } from '../types';
import { ok, fail } from '../utils/response';
import { logger } from '../utils/logger';

const router = Router();

// Get user's enabled channels
router.get('/', authenticateUser, async (req, res) => {
  try {
    const user = (req as AuthRequest).user!;
    const db = await getDb();

    const channels = await db.all(
      `SELECT id, youtube_channel_id, channel_name, thumbnail_url, enabled
       FROM channels
       WHERE user_id = ?
       ORDER BY channel_name`,
      [user.id]
    );

    res.json(channels);
  } catch (error) {
    logger.error('Error fetching channels:', error);
    fail(res, 500, 'Failed to fetch channels');
  }
});

// Toggle channel enabled/disabled
router.put('/:id/toggle', authenticateUser, async (req, res): Promise<Response> => {
  try {
    const user = (req as AuthRequest).user!;
    const channelId = parseInt(req.params.id);
    const { enabled } = req.body;

    const db = await getDb();

    // Verify channel belongs to user
    const channel = await db.get(
      'SELECT id FROM channels WHERE id = ? AND user_id = ?',
      [channelId, user.id]
    );

    if (!channel) {
      return fail(res, 404, 'Channel not found');
    }

    await db.run(
      'UPDATE channels SET enabled = ? WHERE id = ?',
      [enabled ? 1 : 0, channelId]
    );

    return ok(res);
  } catch (error) {
    logger.error('Error toggling channel:', error);
    return fail(res, 500, 'Failed to toggle channel');
  }
});

export default router;
