import { Router, Response } from 'express';
import { authenticateUser } from '../middleware/auth';
import { timelineGenerator } from '../services/timeline-generator';
import { AuthRequest } from '../types';

const router = Router();

// Always use regular auth middleware (which now auto-uses user ID 1)
const authMiddleware = authenticateUser;

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
    console.error('Error fetching timeline:', error);
    res.status(500).json({ error: 'Failed to fetch timeline' });
  }
});

// Get what's playing now on a specific channel
router.get('/current-program', authMiddleware, async (req, res): Promise<Response> => {
  try {
    const user = (req as AuthRequest).user!;
    const { channelId, localHour, localMinute, localSecond } = req.query;

    if (!channelId) {
      return res.status(400).json({ error: 'Channel ID required' });
    }

    // Use local time components from frontend to avoid timezone issues
    // (Docker runs in UTC but user's browser uses local time)
    const now = new Date();
    const hour = localHour !== undefined ? parseInt(localHour as string) : now.getHours();
    const minute = localMinute !== undefined ? parseInt(localMinute as string) : now.getMinutes();
    const second = localSecond !== undefined ? parseInt(localSecond as string) : now.getSeconds();
    const currentSeconds = hour * 3600 + minute * 60 + second;

    const result = await timelineGenerator.getCurrentProgramBySeconds(
      user.id.toString(),
      channelId as string,
      currentSeconds
    );
    
    return res.json(result);
  } catch (error) {
    console.error('Error fetching current program:', error);
    return res.status(500).json({ error: 'Failed to fetch current program' });
  }
});

// Force timeline regeneration
router.post('/regenerate', authMiddleware, async (req, res) => {
  try {
    const user = (req as AuthRequest).user!;
    const { date } = req.body;
    const targetDate = date || new Date().toISOString().split('T')[0];
    
    // Clear existing timeline from cache and database
    const { cacheManager } = await import('../services/cache-manager');
    const { getDb } = await import('../services/database');
    
    // Clear from memory cache
    cacheManager.clearCache();
    
    // Clear from database
    const db = await getDb();
    await db.run(
      'DELETE FROM timelines WHERE user_id = ? AND date = ?',
      [user.id, targetDate]
    );
    
    // Generate new timeline with force refresh
    const timeline = await timelineGenerator.generateTimeline(
      user.id.toString(),
      targetDate,
      user.settings,
      true // forceRefresh
    );
    
    res.json({ date: targetDate, timeline });
  } catch (error) {
    console.error('Error regenerating timeline:', error);
    res.status(500).json({ error: 'Failed to regenerate timeline' });
  }
});

export default router;