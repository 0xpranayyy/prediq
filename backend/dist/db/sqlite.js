"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.initDB = initDB;
exports.query = query;
exports.healthCheck = healthCheck;
const sqlite3_1 = __importDefault(require("sqlite3"));
const sqlite_1 = require("sqlite");
const path_1 = __importDefault(require("path"));
const fs_1 = __importDefault(require("fs"));
let db = null;
async function initDB() {
    const dbPath = path_1.default.join(__dirname, '../../data/prediq.db');
    // Ensure data directory exists
    const dataDir = path_1.default.dirname(dbPath);
    if (!fs_1.default.existsSync(dataDir)) {
        fs_1.default.mkdirSync(dataDir, { recursive: true });
    }
    db = await (0, sqlite_1.open)({
        filename: dbPath,
        driver: sqlite3_1.default.Database
    });
    // Create tables
    await db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      wallet_address TEXT PRIMARY KEY,
      username TEXT NOT NULL,
      profile_image_url TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

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
      aptos_txn_hash TEXT,
      shelby_cid TEXT,
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
      aptos_txn_hash TEXT,
      shelby_cid TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS indexer_cursor (
      id INTEGER PRIMARY KEY,
      last_version TEXT DEFAULT '0',
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    INSERT OR IGNORE INTO indexer_cursor (id) VALUES (1);

    CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);
    CREATE INDEX IF NOT EXISTS idx_markets_creator ON markets(creator);
    CREATE INDEX IF NOT EXISTS idx_markets_end_time ON markets(end_time);
    CREATE INDEX IF NOT EXISTS idx_markets_resolved ON markets(resolved);
    CREATE INDEX IF NOT EXISTS idx_bets_bettor ON bets(bettor);
    CREATE INDEX IF NOT EXISTS idx_bets_market_id ON bets(market_id);
    CREATE INDEX IF NOT EXISTS idx_bets_claimed ON bets(claimed);
  `);
    // Add missing columns if they don't exist (for existing databases)
    await db.exec('ALTER TABLE markets ADD COLUMN aptos_txn_hash TEXT').catch(() => { }); // Ignore if column already exists
    await db.exec('ALTER TABLE markets ADD COLUMN shelby_cid TEXT').catch(() => { }); // Ignore if column already exists
    await db.exec('ALTER TABLE bets ADD COLUMN aptos_txn_hash TEXT').catch(() => { }); // Ignore if column already exists
    await db.exec('ALTER TABLE bets ADD COLUMN shelby_cid TEXT').catch(() => { }); // Ignore if column already exists
    console.log('[DB] SQLite database initialized');
}
async function query(sql, params = []) {
    if (!db)
        throw new Error('Database not initialized');
    const stmt = await db.prepare(sql);
    try {
        const result = await stmt.all(...params);
        return { rows: result };
    }
    finally {
        await stmt.finalize();
    }
}
async function healthCheck() {
    if (!db)
        return false;
    try {
        await db.get('SELECT 1');
        return true;
    }
    catch {
        return false;
    }
}
//# sourceMappingURL=sqlite.js.map