import { Router, type Request, type Response } from 'express';
import { timingSafeEqual } from 'crypto';
import {
  signSessionToken,
  requireAuth,
  COOKIE_NAME,
  COOKIE_MAX_AGE_MS,
  type AuthedRequest,
} from '../middleware/auth';

export const authRouter = Router();

const ADMIN_USERNAME = process.env.ADMIN_USERNAME || 'admin';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || '';
const isProd = process.env.NODE_ENV === 'production';

function safeEqual(a: string, b: string): boolean {
  const aBuf = Buffer.from(a);
  const bBuf = Buffer.from(b);
  if (aBuf.length !== bBuf.length) return false;
  return timingSafeEqual(aBuf, bBuf);
}

authRouter.post('/login', (req: Request, res: Response) => {
  const body = req.body as { username?: unknown; password?: unknown };
  const username = typeof body.username === 'string' ? body.username : '';
  const password = typeof body.password === 'string' ? body.password : '';

  if (!username || !password) {
    res.status(400).json({ error: 'Username and password are required' });
    return;
  }
  if (!ADMIN_PASSWORD) {
    console.error('ADMIN_PASSWORD env var is not set');
    res.status(500).json({ error: 'Server is misconfigured' });
    return;
  }
  const userOk = safeEqual(username, ADMIN_USERNAME);
  const passOk = safeEqual(password, ADMIN_PASSWORD);
  if (!userOk || !passOk) {
    res.status(401).json({ error: 'Invalid credentials' });
    return;
  }

  const token = signSessionToken({ username: ADMIN_USERNAME });
  res.cookie(COOKIE_NAME, token, {
    httpOnly: true,
    secure: isProd,
    sameSite: 'lax',
    maxAge: COOKIE_MAX_AGE_MS,
    path: '/',
  });
  res.json({ ok: true, username: ADMIN_USERNAME });
});

authRouter.post('/logout', (_req: Request, res: Response) => {
  res.clearCookie(COOKIE_NAME, { path: '/' });
  res.json({ ok: true });
});

authRouter.get('/me', requireAuth, (req: AuthedRequest, res: Response) => {
  res.json({ username: req.auth!.username });
});
