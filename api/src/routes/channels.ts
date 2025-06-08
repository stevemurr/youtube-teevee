import { Router, Response } from 'express';
import { authenticateUser } from '../middleware/auth';
import { getDb } from '../services/database';
import { AuthRequest } from '../types';

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
    console.error('Error fetching channels:', error);
    res.status(500).json({ error: 'Failed to fetch channels' });
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
      return res.status(404).json({ error: 'Channel not found' });
    }
    
    // Update channel status
    await db.run(
      'UPDATE channels SET enabled = ? WHERE id = ?',
      [enabled ? 1 : 0, channelId]
    );
    
    return res.json({ success: true });
  } catch (error) {
    console.error('Error toggling channel:', error);
    return res.status(500).json({ error: 'Failed to toggle channel' });
  }
});

export default router;