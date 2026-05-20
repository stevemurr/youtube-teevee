import { Router } from 'express';
import { getDb } from '../services/database';
import { generateJWT } from '../middleware/auth';
import { ok, fail } from '../utils/response';
import { logger } from '../utils/logger';

const router = Router();

// Database login - the only way to authenticate
router.post('/login', async (_req, res) => {
  try {
    logger.log('[Database Auth] Logging in with database user');

    const db = await getDb();

    const user = await db.get(
      'SELECT * FROM users WHERE id = ?',
      [1]
    );

    if (!user) {
      return fail(res, 404, 'No user found. Please run the populate-db script first.');
    }

    const token = generateJWT({
      userId: user.id,
      youtubeUserId: user.youtube_user_id || 'local-user'
    });

    logger.log('[Database Auth] Login successful for user:', user.name);
    return ok(res, {
      token,
      user: {
        id: user.id,
        name: user.name || 'Local User',
        avatarUrl: user.avatar_url || ''
      }
    });
  } catch (error) {
    logger.error('[Database Auth] Error:', error);
    return fail(res, 500, 'Database login failed');
  }
});

// Logout
router.delete('/logout', (_req, res) => {
  ok(res, { message: 'Logged out successfully' });
});

export default router;
