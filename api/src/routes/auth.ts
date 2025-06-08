import { Router } from 'express';
import { getDb } from '../services/database';
import { generateJWT } from '../middleware/auth';

const router = Router();

// Database login - the only way to authenticate
router.post('/login', async (_req, res) => {
  try {
    console.log('[Database Auth] Logging in with database user');
    
    const db = await getDb();
    
    // Get user ID 1 from database (created by populate-db script)
    const user = await db.get(
      'SELECT * FROM users WHERE id = ?',
      [1]
    );
    
    if (!user) {
      return res.status(404).json({ 
        error: 'No user found. Please run the populate-db script first.' 
      });
    }
    
    // Generate JWT token
    const token = generateJWT({
      userId: user.id,
      youtubeUserId: user.youtube_user_id || 'local-user'
    });
    
    console.log('[Database Auth] Login successful for user:', user.name);
    return res.json({
      token,
      user: {
        id: user.id,
        name: user.name || 'Local User',
        avatarUrl: user.avatar_url || ''
      }
    });
  } catch (error) {
    console.error('[Database Auth] Error:', error);
    return res.status(500).json({ error: 'Database login failed' });
  }
});

// Logout
router.delete('/logout', (_req, res) => {
  // Client should remove JWT token
  res.json({ message: 'Logged out successfully' });
});

export default router;