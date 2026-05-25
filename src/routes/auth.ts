import { Hono } from 'hono';
import { getDb } from '../services/database';
import { generateJWT } from '../middleware/auth';
import { ok, fail } from '../utils/response';
import { logger } from '../utils/logger';
import type { HonoEnv } from '../types';

const router = new Hono<HonoEnv>();

router.post('/login', async (c) => {
  try {
    const db = getDb();

    db.query(`INSERT OR IGNORE INTO users (youtube_user_id, name, settings) VALUES (?, ?, ?)`)
      .run('local-user', 'Local User', '{}');

    const user = db.query('SELECT * FROM users WHERE id = 1').get() as any;

    if (!user) {
      return fail(c, 500, 'Failed to initialize local user');
    }

    const token = await generateJWT({
      userId: user.id,
      youtubeUserId: user.youtube_user_id || 'local-user',
    });

    logger.log('[Auth] Login successful for user:', user.name);
    return ok(c, {
      token,
      user: {
        id: user.id,
        name: user.name || 'Local User',
        avatarUrl: user.avatar_url || '',
      },
    });
  } catch (error) {
    logger.error('[Auth] Error:', error);
    return fail(c, 500, 'Login failed');
  }
});

router.delete('/logout', (c) => ok(c, { message: 'Logged out successfully' }));

export default router;
