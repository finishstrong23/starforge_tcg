/**
 * STARFORGE TCG - OAuth Routes
 *
 * Handles OAuth login flows for Google, Apple, and Discord.
 */

import { Router, Request, Response } from 'express';
import { authenticateToken, AuthRequest } from '../middleware/auth';
import * as OAuthService from '../services/OAuthService';

const router = Router();

/** GET /api/auth/oauth/:provider — Get OAuth authorization URL */
router.get('/:provider', (req: Request, res: Response) => {
  try {
    const provider = req.params.provider as OAuthService.OAuthProvider;
    if (!['google', 'apple', 'discord'].includes(provider)) {
      res.status(400).json({ error: 'Unsupported OAuth provider' });
      return;
    }

    const url = OAuthService.getAuthorizationUrl(provider);
    res.json({ url });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to get authorization URL';
    res.status(500).json({ error: message });
  }
});

/** GET /api/auth/oauth/google/callback — Google OAuth callback */
router.get('/google/callback', async (req: Request, res: Response) => {
  try {
    const { code } = req.query;
    if (!code || typeof code !== 'string') {
      res.status(400).json({ error: 'Authorization code required' });
      return;
    }

    const accessToken = await OAuthService.exchangeGoogleCode(code);
    const profile = await OAuthService.fetchGoogleProfile(accessToken);
    const result = await OAuthService.authenticateOAuth(profile);

    // Redirect to client with tokens
    const params = new URLSearchParams({
      accessToken: result.tokens.accessToken,
      refreshToken: result.tokens.refreshToken,
    });
    res.redirect(`/?auth=success&${params.toString()}`);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Google login failed';
    res.redirect(`/?auth=error&message=${encodeURIComponent(message)}`);
  }
});

/** GET /api/auth/oauth/discord/callback — Discord OAuth callback */
router.get('/discord/callback', async (req: Request, res: Response) => {
  try {
    const { code } = req.query;
    if (!code || typeof code !== 'string') {
      res.status(400).json({ error: 'Authorization code required' });
      return;
    }

    const accessToken = await OAuthService.exchangeDiscordCode(code);
    const profile = await OAuthService.fetchDiscordProfile(accessToken);
    const result = await OAuthService.authenticateOAuth(profile);

    const params = new URLSearchParams({
      accessToken: result.tokens.accessToken,
      refreshToken: result.tokens.refreshToken,
    });
    res.redirect(`/?auth=success&${params.toString()}`);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Discord login failed';
    res.redirect(`/?auth=error&message=${encodeURIComponent(message)}`);
  }
});

/** POST /api/auth/oauth/apple/callback — Apple Sign-In callback (form_post) */
router.post('/apple/callback', async (req: Request, res: Response) => {
  try {
    const { id_token, user } = req.body;
    if (!id_token) {
      res.status(400).json({ error: 'ID token required' });
      return;
    }

    // Decode Apple's ID token (in production, verify with Apple's public key)
    const parts = id_token.split('.');
    const payload = JSON.parse(Buffer.from(parts[1], 'base64url').toString());

    const profile: OAuthService.OAuthProfile = {
      provider: 'apple',
      providerId: payload.sub,
      email: payload.email || '',
      displayName: user?.name?.firstName
        ? `${user.name.firstName} ${user.name.lastName || ''}`.trim()
        : payload.email?.split('@')[0] || 'Player',
    };

    const result = await OAuthService.authenticateOAuth(profile);

    const params = new URLSearchParams({
      accessToken: result.tokens.accessToken,
      refreshToken: result.tokens.refreshToken,
    });
    res.redirect(`/?auth=success&${params.toString()}`);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Apple login failed';
    res.redirect(`/?auth=error&message=${encodeURIComponent(message)}`);
  }
});

/** POST /api/auth/oauth/token — Exchange OAuth token directly (for mobile) */
router.post('/token', async (req: Request, res: Response) => {
  try {
    const { provider, accessToken: providerToken } = req.body;
    if (!provider || !providerToken) {
      res.status(400).json({ error: 'Provider and accessToken required' });
      return;
    }

    let profile: OAuthService.OAuthProfile;
    switch (provider) {
      case 'google':
        profile = await OAuthService.fetchGoogleProfile(providerToken);
        break;
      case 'discord':
        profile = await OAuthService.fetchDiscordProfile(providerToken);
        break;
      default:
        res.status(400).json({ error: 'Unsupported provider for token exchange' });
        return;
    }

    const result = await OAuthService.authenticateOAuth(profile);
    res.json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'OAuth login failed';
    res.status(401).json({ error: message });
  }
});

/** GET /api/auth/oauth/linked — Get linked OAuth accounts */
router.get('/linked', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const accounts = await OAuthService.getLinkedAccounts(req.user!.userId);
    res.json({ accounts });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch linked accounts' });
  }
});

/** DELETE /api/auth/oauth/:provider — Unlink an OAuth account */
router.delete('/:provider', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const provider = req.params.provider as OAuthService.OAuthProvider;
    if (!['google', 'apple', 'discord'].includes(provider)) {
      res.status(400).json({ error: 'Unsupported OAuth provider' });
      return;
    }

    await OAuthService.unlinkAccount(req.user!.userId, provider);
    res.json({ status: 'unlinked' });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to unlink account';
    res.status(400).json({ error: message });
  }
});

export default router;
