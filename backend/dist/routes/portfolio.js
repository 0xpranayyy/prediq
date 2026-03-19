"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const sqlite_1 = require("../db/sqlite");
const router = (0, express_1.Router)();
// GET /api/portfolio/:address - get user portfolio
router.get('/:address', async (req, res) => {
    try {
        const { address } = req.params;
        // Active bets (unclaimed)
        const activeBets = await (0, sqlite_1.query)(`SELECT b.id, b.bettor, b.market_id, b.amount, b.side, b.claimed,
              b.aptos_txn_hash, b.shelby_cid, b.created_at, b.updated_at
       FROM bets b
       JOIN markets m ON m.on_chain_id = b.market_id
       WHERE b.bettor = $1 AND b.claimed = FALSE
       ORDER BY b.created_at DESC`, [address]);
        // Claimed bets
        const claimedBets = await (0, sqlite_1.query)(`SELECT b.id, b.bettor, b.market_id, b.amount, b.side, b.claimed,
              b.aptos_txn_hash, b.shelby_cid, b.created_at, b.updated_at
       FROM bets b
       WHERE b.bettor = $1 AND b.claimed = TRUE
       ORDER BY b.created_at DESC`, [address]);
        // Totals
        const totals = await (0, sqlite_1.query)(`SELECT
        COALESCE(SUM(amount), 0) as total_invested,
        COALESCE(SUM(CASE WHEN claimed THEN amount ELSE 0 END), 0) as total_winnings
       FROM bets WHERE bettor = $1`, [address]);
        res.json({
            total_invested: totals.rows[0]?.total_invested || '0',
            total_winnings: totals.rows[0]?.total_winnings || '0',
            active_bets: activeBets.rows,
            claimed_bets: claimedBets.rows,
        });
    }
    catch (err) {
        console.error('[API] GET /portfolio/:address error:', err);
        res.status(500).json({ error: 'Failed to fetch portfolio' });
    }
});
exports.default = router;
//# sourceMappingURL=portfolio.js.map