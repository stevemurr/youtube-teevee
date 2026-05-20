import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { getDb } from '../services/database';
import { AuthRequest, TokenPayload } from '../types';
import { config } from '../config';
import { logger } from '../utils/logger';

const JWT_SECRET = config.jwtSecret;

export function generateJWT(payload: TokenPayload): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: '7d' });
}

export function verifyJWT(token: string): TokenPayload {
  return jwt.verify(token, JWT_SECRET) as TokenPayload;
}

export async function authenticateUser(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void | Response> {
  try {
    // BYPASS AUTH - Always use user ID 1 from existing database
    const db = await getDb();
    const user = await db.get(
      'SELECT * FROM users WHERE id = ?',
      [1]
    );

    if (!user) {
      return res.status(401).json({ error: 'User not found in database' });
    }

    // Parse settings JSON
    try {
      user.settings = JSON.parse(user.settings || '{}');
    } catch {
      user.settings = {};
    }

    // Attach user to request
    (req as AuthRequest).user = user;

    next();
  } catch (error) {
    logger.error('Auth bypass error:', error);
    return res.status(500).json({ error: 'Database error' });
  }
}