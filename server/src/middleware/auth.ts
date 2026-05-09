import type { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-change-me';
export const COOKIE_NAME = 'sg_session';
export const COOKIE_MAX_AGE_MS = 30 * 24 * 60 * 60 * 1000;

export interface AuthPayload {
  username: string;
}

export interface AuthedRequest extends Request {
  auth?: AuthPayload;
}

export function signSessionToken(payload: AuthPayload): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: '30d' });
}

export function verifySessionToken(token: string): AuthPayload | null {
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    if (
      typeof decoded === 'object' &&
      decoded !== null &&
      'username' in decoded &&
      typeof (decoded as Record<string, unknown>).username === 'string'
    ) {
      return { username: (decoded as Record<string, unknown>).username as string };
    }
    return null;
  } catch {
    return null;
  }
}

export function requireAuth(req: AuthedRequest, res: Response, next: NextFunction): void {
  const cookies = (req as Request & { cookies?: Record<string, string> }).cookies;
  const token = cookies?.[COOKIE_NAME];
  if (!token) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }
  const payload = verifySessionToken(token);
  if (!payload) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }
  req.auth = payload;
  next();
}
