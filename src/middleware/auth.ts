import { createMiddleware } from 'hono/factory';
import { sign, verify } from 'hono/jwt';
import { getDb } from '../services/database';
import type { HonoEnv, TokenPayload } from '../types';
import { config } from '../config';
import { logger } from '../utils/logger';

export async function generateJWT(payload: TokenPayload): Promise<string> {
  return sign(
    { ...payload, exp: Math.floor(Date.now() / 1000) + 7 * 24 * 60 * 60 },
    config.jwtSecret
  );
}

export async function verifyJWT(token: string): Promise<TokenPayload> {
  const payload = await verify(token, config.jwtSecret, 'HS256');
  return payload as unknown as TokenPayload;
}

export const authenticateUser = createMiddleware<HonoEnv>(async (c, next) => {
  try {
    const db = getDb();
    const user = db.query('SELECT * FROM users WHERE id = ?').get(1) as any;

    if (!user) {
      return c.json({ error: 'User not found in database' }, 401);
    }

    try {
      user.settings = JSON.parse(user.settings || '{}');
    } catch {
      user.settings = {};
    }

    c.set('user', user);
    return next();
  } catch (error) {
    logger.error('Auth error:', error);
    return c.json({ error: 'Database error' }, 500);
  }
});
