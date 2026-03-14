import sqlite3 from 'sqlite3';
import { open, Database } from 'sqlite';
import path from 'path';
import fs from 'fs';

let db: Database | null = null;

export async function initDB(): Promise<void> {
  const dbPath = path.join(__dirname, '../../data/prediq.db');
  
  // Ensure data directory exists
  const dataDir = path.dirname(dbPath);
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }

  db = await open({
    filename: dbPath,
    driver: sqlite3.Database
  });

  // Create tables
  await db.exec(`
    CREATE TABLE IF NOT EXISTS markets (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      on_chain_id TEXT UNIQUE NOT NULL,
      question TEXT NOT NULL,
      creator TEXT NOT NULL,
      yes_pool TEXT DEFAULT '0',
      no_pool TEXT DEFAULT '0',
      end_time INTEGER NOT NULL,
      resolved BOOLEAN DEFAULT FALSE,
      outcome BOOLEAN DEFAULT FALSE,
      total_yes_bets TEXT DEFAULT '0',
      total_no_bets TEXT DEFAULT '0',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS bets (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      bettor TEXT NOT NULL,
      market_id TEXT NOT NULL,
      amount TEXT NOT NULL,
      side BOOLEAN NOT NULL,
      claimed BOOLEAN DEFAULT FALSE,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS indexer_cursor (
      id INTEGER PRIMARY KEY,
      last_version TEXT DEFAULT '0',
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    INSERT OR IGNORE INTO indexer_cursor (id) VALUES (1);

    CREATE INDEX IF NOT EXISTS idx_markets_creator ON markets(creator);
    CREATE INDEX IF NOT EXISTS idx_markets_end_time ON markets(end_time);
    CREATE INDEX IF NOT EXISTS idx_markets_resolved ON markets(resolved);
    CREATE INDEX IF NOT EXISTS idx_bets_bettor ON bets(bettor);
    CREATE INDEX IF NOT EXISTS idx_bets_market_id ON bets(market_id);
    CREATE INDEX IF NOT EXISTS idx_bets_claimed ON bets(claimed);
  `);

  console.log('[DB] SQLite database initialized');
}

export async function query(sql: string, params: any[] = []): Promise<any> {
  if (!db) throw new Error('Database not initialized');
  
  const stmt = await db.prepare(sql);
  try {
    const result = await stmt.all(...params);
    return { rows: result };
  } finally {
    await stmt.finalize();
  }
}

export async function healthCheck(): Promise<boolean> {
  if (!db) return false;
  try {
    await db.get('SELECT 1');
    return true;
  } catch {
    return false;
  }
}
