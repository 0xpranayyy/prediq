import { Aptos, AptosConfig, Network } from '@aptos-labs/ts-sdk';
import { query } from './db/sqlite';
import dotenv from 'dotenv';

dotenv.config();

const CONTRACT_ADDRESS = process.env.PREDICTION_MARKET_ADDRESS || '0x1';
const POLL_INTERVAL_MS = 5000;

interface MarketCreatedEvent {
  market_id: string;
  creator: string;
  question: string;
  end_time: string;
}

interface BetPlacedEvent {
  market_id: string;
  bettor: string;
  amount: string;
  side: boolean;
  new_yes_pool: string;
  new_no_pool: string;
}

interface MarketResolvedEvent {
  market_id: string;
  outcome: boolean;
}

interface RewardClaimedEvent {
  market_id: string;
  bettor: string;
  amount: string;
}

export class Indexer {
  private aptos: Aptos;
  private isRunning = false;

  constructor() {
    const config = new AptosConfig({
      network: Network.TESTNET,
    });
    this.aptos = new Aptos(config);
  }

  async start(): Promise<void> {
    if (this.isRunning) return;
    this.isRunning = true;
    console.log('[Indexer] Started — polling on-chain events');

    while (this.isRunning) {
      try {
        await this.poll();
      } catch (err) {
        console.error('[Indexer] Poll error:', err);
      }
      await sleep(POLL_INTERVAL_MS);
    }
  }

  stop(): void {
    this.isRunning = false;
    console.log('[Indexer] Stopped');
  }

  private async poll(): Promise<void> {
    // Get last processed version
    const cursor = await query('SELECT last_version FROM indexer_cursor WHERE id = 1');
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
          if (version <= lastVersion) continue;

          await this.processEvent(eventType, event.data, event.transaction_version);
          if (version > maxVersion) maxVersion = version;
        }
      } catch {
        // Event type may not exist yet if no txns of that type
      }
    }

    // Update cursor
    if (maxVersion > lastVersion) {
      await query('UPDATE indexer_cursor SET last_version = $1, updated_at = NOW() WHERE id = 1', [maxVersion.toString()]);
    }
  }

  private async processEvent(eventType: string, data: any, txnVersion: string): Promise<void> {
    if (eventType.includes('MarketCreated')) {
      await this.handleMarketCreated(data, txnVersion);
    } else if (eventType.includes('BetPlaced')) {
      await this.handleBetPlaced(data, txnVersion);
    } else if (eventType.includes('MarketResolved')) {
      await this.handleMarketResolved(data);
    } else if (eventType.includes('RewardClaimed')) {
      await this.handleRewardClaimed(data);
    }
  }

  private async handleMarketCreated(data: MarketCreatedEvent, txnVersion: string): Promise<void> {
    await query(
      `INSERT INTO markets (on_chain_id, question, creator, end_time)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (on_chain_id) DO NOTHING`,
      [data.market_id, data.question, data.creator, data.end_time]
    );
    console.log(`[Indexer] Market #${data.market_id} created by ${data.creator.slice(0, 10)}...`);
  }

  private async handleBetPlaced(data: BetPlacedEvent, txnVersion: string): Promise<void> {
    // Insert bet record
    await query(
      `INSERT INTO bets (bettor, market_id, amount, side)
       VALUES ($1, $2, $3, $4)`,
      [data.bettor, data.market_id, data.amount, data.side]
    );

    // Update market pools
    await query(
      `UPDATE markets SET yes_pool = $1, no_pool = $2,
       total_yes_bets = total_yes_bets + CASE WHEN $3 THEN $4::bigint ELSE 0 END,
       total_no_bets = total_no_bets + CASE WHEN NOT $3 THEN $4::bigint ELSE 0 END,
       updated_at = NOW()
       WHERE on_chain_id = $5`,
      [data.new_yes_pool, data.new_no_pool, data.side, data.amount, data.market_id]
    );
    console.log(`[Indexer] Bet on market #${data.market_id}: ${data.side ? 'YES' : 'NO'} ${data.amount}`);
  }

  private async handleMarketResolved(data: MarketResolvedEvent): Promise<void> {
    await query(
      `UPDATE markets SET resolved = TRUE, outcome = $1, updated_at = NOW()
       WHERE on_chain_id = $2`,
      [data.outcome, data.market_id]
    );
    console.log(`[Indexer] Market #${data.market_id} resolved → ${data.outcome ? 'YES' : 'NO'}`);
  }

  private async handleRewardClaimed(data: RewardClaimedEvent): Promise<void> {
    await query(
      `UPDATE bets SET claimed = TRUE, updated_at = NOW()
       WHERE bettor = $1 AND market_id = $2 AND claimed = FALSE
       LIMIT 1`,
      [data.bettor, data.market_id]
    );
    console.log(`[Indexer] Reward claimed: market #${data.market_id} by ${data.bettor.slice(0, 10)}...`);
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

export const indexer = new Indexer();
