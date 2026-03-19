import { Pool, PoolClient } from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432'),
  database: process.env.DB_NAME || 'prediq',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'password',
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

export interface Market {
  id: number;
  question: string;
  creator: string;
  yes_pool: string;
  no_pool: string;
  end_time: number;
  resolved: boolean;
  outcome: boolean;
  total_yes_bets: string;
  total_no_bets: string;
  created_at: Date;
  updated_at: Date;
}

export interface Bet {
  id: number;
  bettor: string;
  market_id: number;
  amount: string;
  side: boolean;
  claimed: boolean;
  created_at: Date;
  updated_at: Date;
}

export interface User {
  wallet_address: string;
  username: string;
  profile_image_url?: string;
  created_at: Date;
  updated_at: Date;
}

export interface UserPortfolio {
  total_invested: string;
  total_winnings: string;
  active_bets: Bet[];
  claimed_bets: Bet[];
}

export async function initializeDatabase(): Promise<void> {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Create users table
    await client.query(`
      CREATE TABLE IF NOT EXISTS users (
        wallet_address VARCHAR(66) PRIMARY KEY,
        username VARCHAR(50) NOT NULL,
        profile_image_url TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Create markets table
    await client.query(`
      CREATE TABLE IF NOT EXISTS markets (
        id SERIAL PRIMARY KEY,
        question TEXT NOT NULL,
        creator VARCHAR(66) NOT NULL,
        yes_pool VARCHAR(20) NOT NULL DEFAULT '0',
        no_pool VARCHAR(20) NOT NULL DEFAULT '0',
        end_time BIGINT NOT NULL,
        resolved BOOLEAN NOT NULL DEFAULT FALSE,
        outcome BOOLEAN NOT NULL DEFAULT FALSE,
        total_yes_bets VARCHAR(20) NOT NULL DEFAULT '0',
        total_no_bets VARCHAR(20) NOT NULL DEFAULT '0',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Create bets table
    await client.query(`
      CREATE TABLE IF NOT EXISTS bets (
        id SERIAL PRIMARY KEY,
        bettor VARCHAR(66) NOT NULL,
        market_id INTEGER NOT NULL REFERENCES markets(id),
        amount VARCHAR(20) NOT NULL,
        side BOOLEAN NOT NULL,
        claimed BOOLEAN NOT NULL DEFAULT FALSE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Create indexes
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);
      CREATE INDEX IF NOT EXISTS idx_markets_creator ON markets(creator);
      CREATE INDEX IF NOT EXISTS idx_markets_end_time ON markets(end_time);
      CREATE INDEX IF NOT EXISTS idx_markets_resolved ON markets(resolved);
      CREATE INDEX IF NOT EXISTS idx_bets_bettor ON bets(bettor);
      CREATE INDEX IF NOT EXISTS idx_bets_market_id ON bets(market_id);
      CREATE INDEX IF NOT EXISTS idx_bets_claimed ON bets(claimed);
    `);

    await client.query('COMMIT');
    console.log('Database initialized successfully');
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Failed to initialize database:', error);
    throw error;
  } finally {
    client.release();
  }
}

export async function upsertMarket(market: Omit<Market, 'id' | 'created_at' | 'updated_at'>): Promise<Market> {
  const client = await pool.connect();
  try {
    const result = await client.query(`
      INSERT INTO markets (question, creator, yes_pool, no_pool, end_time, resolved, outcome, total_yes_bets, total_no_bets)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      ON CONFLICT (id) 
      DO UPDATE SET
        question = EXCLUDED.question,
        yes_pool = EXCLUDED.yes_pool,
        no_pool = EXCLUDED.no_pool,
        resolved = EXCLUDED.resolved,
        outcome = EXCLUDED.outcome,
        total_yes_bets = EXCLUDED.total_yes_bets,
        total_no_bets = EXCLUDED.total_no_bets,
        updated_at = CURRENT_TIMESTAMP
      RETURNING *
    `, [
      market.question,
      market.creator,
      market.yes_pool,
      market.no_pool,
      market.end_time,
      market.resolved,
      market.outcome,
      market.total_yes_bets,
      market.total_no_bets
    ]);

    return result.rows[0];
  } finally {
    client.release();
  }
}

export async function insertBet(bet: Omit<Bet, 'id' | 'created_at' | 'updated_at'>): Promise<Bet> {
  const client = await pool.connect();
  try {
    const result = await client.query(`
      INSERT INTO bets (bettor, market_id, amount, side, claimed)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING *
    `, [bet.bettor, bet.market_id, bet.amount, bet.side, bet.claimed]);

    return result.rows[0];
  } finally {
    client.release();
  }
}

export async function getMarkets(limit: number = 50, offset: number = 0): Promise<Market[]> {
  const client = await pool.connect();
  try {
    const result = await client.query(`
      SELECT * FROM markets 
      ORDER BY created_at DESC 
      LIMIT $1 OFFSET $2
    `, [limit, offset]);

    return result.rows;
  } finally {
    client.release();
  }
}

export async function getMarket(id: number): Promise<Market | null> {
  const client = await pool.connect();
  try {
    const result = await client.query(`
      SELECT * FROM markets WHERE id = $1
    `, [id]);

    return result.rows[0] || null;
  } finally {
    client.release();
  }
}

export async function getUserPortfolio(walletAddress: string): Promise<UserPortfolio> {
  const client = await pool.connect();
  try {
    // Get all user bets
    const betsResult = await client.query(`
      SELECT b.*, m.resolved, m.outcome 
      FROM bets b 
      JOIN markets m ON b.market_id = m.id 
      WHERE b.bettor = $1 
      ORDER BY b.created_at DESC
    `, [walletAddress]);

    const bets = betsResult.rows;
    
    let totalInvested = BigInt(0);
    let totalWinnings = BigInt(0);
    const activeBets: Bet[] = [];
    const claimedBets: Bet[] = [];

    for (const bet of bets) {
      const betAmount = BigInt(bet.amount);
      totalInvested += betAmount;

      if (bet.claimed) {
        claimedBets.push(bet);
      } else {
        activeBets.push(bet);
        
        // Calculate potential winnings for resolved markets
        if (bet.resolved && bet.side === bet.outcome) {
          const market = await getMarket(bet.market_id);
          if (market) {
            const yesPool = BigInt(market.yes_pool);
            const noPool = BigInt(market.no_pool);
            const totalPool = yesPool + noPool;
            const poolSide = bet.side ? yesPool : noPool;
            const reward = (betAmount * totalPool) / poolSide;
            totalWinnings += reward;
          }
        }
      }
    }

    return {
      total_invested: totalInvested.toString(),
      total_winnings: totalWinnings.toString(),
      active_bets: activeBets,
      claimed_bets: claimedBets
    };
  } finally {
    client.release();
  }
}

export async function closePool(): Promise<void> {
  await pool.end();
}

// User profile functions
export async function upsertUser(user: Omit<User, 'created_at' | 'updated_at'>): Promise<User> {
  const client = await pool.connect();
  try {
    const result = await client.query(`
      INSERT INTO users (wallet_address, username, profile_image_url)
      VALUES ($1, $2, $3)
      ON CONFLICT (wallet_address) 
      DO UPDATE SET
        username = EXCLUDED.username,
        profile_image_url = EXCLUDED.profile_image_url,
        updated_at = CURRENT_TIMESTAMP
      RETURNING *
    `, [user.wallet_address, user.username, user.profile_image_url]);

    return result.rows[0];
  } finally {
    client.release();
  }
}

export async function getUser(walletAddress: string): Promise<User | null> {
  const client = await pool.connect();
  try {
    const result = await client.query(`
      SELECT * FROM users WHERE wallet_address = $1
    `, [walletAddress]);

    return result.rows[0] || null;
  } finally {
    client.release();
  }
}
