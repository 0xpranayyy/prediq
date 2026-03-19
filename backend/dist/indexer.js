"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.indexer = exports.Indexer = void 0;
const ts_sdk_1 = require("@aptos-labs/ts-sdk");
const sqlite_1 = require("./db/sqlite");
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
const CONTRACT_ADDRESS = process.env.PREDICTION_MARKET_ADDRESS || '0x1';
const POLL_INTERVAL_MS = 5000;
class Indexer {
    constructor() {
        this.isRunning = false;
        const config = new ts_sdk_1.AptosConfig({
            network: ts_sdk_1.Network.TESTNET,
        });
        this.aptos = new ts_sdk_1.Aptos(config);
    }
    async start() {
        if (this.isRunning)
            return;
        this.isRunning = true;
        console.log('[Indexer] Started — polling on-chain events');
        while (this.isRunning) {
            try {
                await this.poll();
            }
            catch (err) {
                console.error('[Indexer] Poll error:', err);
            }
            await sleep(POLL_INTERVAL_MS);
        }
    }
    stop() {
        this.isRunning = false;
        console.log('[Indexer] Stopped');
    }
    async poll() {
        // Get last processed version
        const cursor = await (0, sqlite_1.query)('SELECT last_version FROM indexer_cursor WHERE id = 1');
        const lastVersion = BigInt(cursor.rows[0]?.last_version || 0);
        // Fetch events from Aptos node
        const eventTypes = [
            `${CONTRACT_ADDRESS}::market::MarketCreated`,
            `${CONTRACT_ADDRESS}::market::BetPlaced`,
            `${CONTRACT_ADDRESS}::market::MarketResolved`,
            `${CONTRACT_ADDRESS}::market::RewardClaimed`,
        ];
        let maxVersion = lastVersion;
        for (const eventType of eventTypes) {
            try {
                const events = await this.aptos.getEvents({
                    options: { where: { account_address: { _eq: CONTRACT_ADDRESS }, type: { _eq: eventType } } },
                });
                for (const event of events) {
                    const version = BigInt(event.transaction_version);
                    if (version <= lastVersion)
                        continue;
                    await this.processEvent(eventType, event.data, event.transaction_version);
                    if (version > maxVersion)
                        maxVersion = version;
                }
            }
            catch {
                // Event type may not exist yet if no txns of that type
            }
        }
        // Update cursor
        if (maxVersion > lastVersion) {
            await (0, sqlite_1.query)('UPDATE indexer_cursor SET last_version = $1, updated_at = NOW() WHERE id = 1', [maxVersion.toString()]);
        }
    }
    async processEvent(eventType, data, txnVersion) {
        if (eventType.includes('MarketCreated')) {
            await this.handleMarketCreated(data, txnVersion);
        }
        else if (eventType.includes('BetPlaced')) {
            await this.handleBetPlaced(data, txnVersion);
        }
        else if (eventType.includes('MarketResolved')) {
            await this.handleMarketResolved(data);
        }
        else if (eventType.includes('RewardClaimed')) {
            await this.handleRewardClaimed(data);
        }
    }
    async handleMarketCreated(data, txnVersion) {
        await (0, sqlite_1.query)(`INSERT INTO markets (on_chain_id, question, creator, end_time)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (on_chain_id) DO NOTHING`, [data.market_id, data.question, data.creator, data.end_time]);
        console.log(`[Indexer] Market #${data.market_id} created by ${data.creator.slice(0, 10)}...`);
    }
    async handleBetPlaced(data, txnVersion) {
        // Insert bet record
        await (0, sqlite_1.query)(`INSERT INTO bets (bettor, market_id, amount, side)
       VALUES ($1, $2, $3, $4)`, [data.bettor, data.market_id, data.amount, data.side]);
        // Update market pools
        await (0, sqlite_1.query)(`UPDATE markets SET yes_pool = $1, no_pool = $2,
       total_yes_bets = total_yes_bets + CASE WHEN $3 THEN $4::bigint ELSE 0 END,
       total_no_bets = total_no_bets + CASE WHEN NOT $3 THEN $4::bigint ELSE 0 END,
       updated_at = NOW()
       WHERE on_chain_id = $5`, [data.new_yes_pool, data.new_no_pool, data.side, data.amount, data.market_id]);
        console.log(`[Indexer] Bet on market #${data.market_id}: ${data.side ? 'YES' : 'NO'} ${data.amount}`);
    }
    async handleMarketResolved(data) {
        await (0, sqlite_1.query)(`UPDATE markets SET resolved = TRUE, outcome = $1, updated_at = NOW()
       WHERE on_chain_id = $2`, [data.outcome, data.market_id]);
        console.log(`[Indexer] Market #${data.market_id} resolved → ${data.outcome ? 'YES' : 'NO'}`);
    }
    async handleRewardClaimed(data) {
        await (0, sqlite_1.query)(`UPDATE bets SET claimed = TRUE, updated_at = NOW()
       WHERE bettor = $1 AND market_id = $2 AND claimed = FALSE
       LIMIT 1`, [data.bettor, data.market_id]);
        console.log(`[Indexer] Reward claimed: market #${data.market_id} by ${data.bettor.slice(0, 10)}...`);
    }
}
exports.Indexer = Indexer;
function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}
exports.indexer = new Indexer();
//# sourceMappingURL=indexer.js.map