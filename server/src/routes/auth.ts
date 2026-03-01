import { Router, Request, Response } from 'express';
import * as AuthService from '../services/AuthService';
import { authenticateToken, AuthRequest } from '../middleware/auth';

const router = Router();

router.post('/register', async (req: Request, res: Response) => {
  try {
    const { username, email, password, displayName } = req.body;

    if (!username || !email || !password) {
      res.status(400).json({ error: 'Username, email, and password are required' });
      return;
    }

    const result = await AuthService.register({ username, email, password, displayName });
    res.status(201).json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Registration failed';
    res.status(400).json({ error: message });
  }
});

router.post('/login', async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      res.status(400).json({ error: 'Email and password are required' });
      return;
    }

    const result = await AuthService.login({ email, password });
    res.json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Login failed';
    res.status(401).json({ error: message });
  }
});

router.post('/refresh', async (req: Request, res: Response) => {
  try {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      res.status(400).json({ error: 'Refresh token is required' });
      return;
    }

    const tokens = await AuthService.refreshTokens(refreshToken);
    res.json(tokens);
  } catch (err) {
    res.status(401).json({ error: 'Invalid refresh token' });
  }
});

router.get('/me', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const profile = await AuthService.getProfile(req.user!.userId);
    res.json(profile);
  } catch (err) {
    res.status(404).json({ error: 'Player not found' });
  }
});

router.patch('/me', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const { displayName, avatarId } = req.body;
    const profile = await AuthService.updateProfile(req.user!.userId, { displayName, avatarId });
    res.json(profile);
  } catch (err) {
    res.status(400).json({ error: 'Update failed' });
  }
});

export default router;
