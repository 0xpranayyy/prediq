import { Router, Request, Response } from 'express';
import { query } from '../db/sqlite';

const router = Router();

// GET /api/users/:address - get user profile
router.get('/:address', async (req: Request, res: Response) => {
  try {
    const { address } = req.params;

    const user = await query(
      `SELECT wallet_address, username, profile_image_url, created_at, updated_at
       FROM users WHERE wallet_address = $1`,
      [address]
    );

    if (user.rows.length === 0) {
      return res.json(null);
    }

    res.json(user.rows[0]);
  } catch (err) {
    console.error('[API] GET /api/users/:address error:', err);
    res.status(500).json({ error: 'Failed to fetch user profile' });
  }
});

// PUT /api/users/:address - update user profile
router.put('/:address', async (req: Request, res: Response) => {
  try {
    const { address } = req.params;
    const { username, profile_image_url } = req.body;

    if (!username || username.trim().length === 0) {
      return res.status(400).json({ error: 'Username is required' });
    }

    if (username.length > 50) {
      return res.status(400).json({ error: 'Username must be 50 characters or less' });
    }

    const result = await query(
      `INSERT INTO users (wallet_address, username, profile_image_url)
       VALUES ($1, $2, $3)
       ON CONFLICT(wallet_address) DO UPDATE SET
         username = excluded.username,
         profile_image_url = excluded.profile_image_url,
         updated_at = CURRENT_TIMESTAMP
       RETURNING wallet_address, username, profile_image_url, created_at, updated_at`,
      [address, username.trim(), profile_image_url || null]
    );

    res.json(result.rows[0]);
  } catch (err) {
    console.error('[API] PUT /api/users/:address error:', err);
    res.status(500).json({ error: 'Failed to update user profile' });
  }
});

export default router;
