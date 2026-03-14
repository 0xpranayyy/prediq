import { Router, Request, Response } from 'express';
import { query } from '../db/sqlite';

const router = Router();

// GET /api/markets - list all markets
router.get('/', async (req: Request, res: Response) => {
  try {
    const limit = parseInt(req.query.limit as string) || 100;
    const offset = parseInt(req.query.offset as string) || 0;

    const result = await query(
      `SELECT on_chain_id as id, question, creator, yes_pool::text, no_pool::text,
              end_time, resolved, outcome, total_yes_bets::text, total_no_bets::text,
              aptos_txn_hash, shelby_cid, created_at, updated_at
       FROM markets ORDER BY created_at DESC LIMIT $1 OFFSET $2`,
      [limit, offset]
    );

    res.json(result.rows);
  } catch (err) {
    console.error('[API] GET /markets error:', err);
    res.status(500).json({ error: 'Failed to fetch markets' });
  }
});

// GET /api/markets/:id - single market
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const result = await query(
      `SELECT on_chain_id as id, question, creator, yes_pool::text, no_pool::text,
              end_time, resolved, outcome, total_yes_bets::text, total_no_bets::text,
              aptos_txn_hash, shelby_cid, created_at, updated_at
       FROM markets WHERE on_chain_id = $1`,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Market not found' });
    }

    res.json(result.rows[0]);
  } catch (err) {
    console.error('[API] GET /markets/:id error:', err);
    res.status(500).json({ error: 'Failed to fetch market' });
  }
});

export default router;
