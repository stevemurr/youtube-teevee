import { Router } from 'express';
import { authenticateUser } from '../middleware/auth';
import { getDb } from '../services/database';
import { AuthRequest } from '../types';

const router = Router();

// Get user settings
router.get('/', authenticateUser, async (req, res) => {
  try {
    const user = (req as AuthRequest).user!;
    res.json(user.settings);
  } catch (error) {
    console.error('Error fetching settings:', error);
    res.status(500).json({ error: 'Failed to fetch settings' });
  }
});

// Update user settings
router.put('/', authenticateUser, async (req, res) => {
  try {
    const user = (req as AuthRequest).user!;
    const settings = req.body;
    
    const db = await getDb();
    await db.run(
      'UPDATE users SET settings = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
      [JSON.stringify(settings), user.id]
    );
    
    res.json(settings);
  } catch (error) {
    console.error('Error updating settings:', error);
    res.status(500).json({ error: 'Failed to update settings' });
  }
});

// Note: Subscription refresh is now handled by the populate-db script
// Users should re-run the script to update their subscriptions

export default router;