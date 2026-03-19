"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const sqlite_1 = require("../db/sqlite");
const router = (0, express_1.Router)();
// GET /api/markets - list all markets
router.get('/', async (req, res) => {
    try {
        const limit = parseInt(req.query.limit) || 100;
        const offset = parseInt(req.query.offset) || 0;
        const result = await (0, sqlite_1.query)(`SELECT on_chain_id as id, question, creator, yes_pool, no_pool,
              end_time, resolved, outcome, total_yes_bets, total_no_bets,
              aptos_txn_hash, shelby_cid, created_at, updated_at
       FROM markets ORDER BY created_at DESC LIMIT $1 OFFSET $2`, [limit, offset]);
        res.json(result.rows);
    }
    catch (err) {
        console.error('[API] GET /markets error:', err);
        res.status(500).json({ error: 'Failed to fetch markets' });
    }
});
// GET /api/markets/:id - single market
router.get('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const result = await (0, sqlite_1.query)(`SELECT on_chain_id as id, question, creator, yes_pool, no_pool,
              end_time, resolved, outcome, total_yes_bets, total_no_bets,
              aptos_txn_hash, shelby_cid, created_at, updated_at
       FROM markets WHERE on_chain_id = $1`, [id]);
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Market not found' });
        }
        res.json(result.rows[0]);
    }
    catch (err) {
        console.error('[API] GET /markets/:id error:', err);
        res.status(500).json({ error: 'Failed to fetch market' });
    }
});
exports.default = router;
//# sourceMappingURL=markets.js.map