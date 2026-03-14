-- PREDIQ Database Schema
-- PostgreSQL 14+

-- Markets table - mirrors on-chain Market struct
CREATE TABLE IF NOT EXISTS markets (
    id SERIAL PRIMARY KEY,
    on_chain_id BIGINT UNIQUE NOT NULL,
    question TEXT NOT NULL,
    creator VARCHAR(66) NOT NULL,
    yes_pool BIGINT NOT NULL DEFAULT 0,
    no_pool BIGINT NOT NULL DEFAULT 0,
    end_time BIGINT NOT NULL,
    resolved BOOLEAN NOT NULL DEFAULT FALSE,
    outcome BOOLEAN DEFAULT NULL,
    total_yes_bets BIGINT NOT NULL DEFAULT 0,
    total_no_bets BIGINT NOT NULL DEFAULT 0,
    aptos_txn_hash VARCHAR(66),
    shelby_cid VARCHAR(100),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Bets table - mirrors on-chain Bet struct
CREATE TABLE IF NOT EXISTS bets (
    id SERIAL PRIMARY KEY,
    bettor VARCHAR(66) NOT NULL,
    market_id BIGINT NOT NULL REFERENCES markets(on_chain_id),
    amount BIGINT NOT NULL,
    side BOOLEAN NOT NULL,
    claimed BOOLEAN NOT NULL DEFAULT FALSE,
    aptos_txn_hash VARCHAR(66),
    shelby_cid VARCHAR(100),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexer cursor - tracks last processed event sequence
CREATE TABLE IF NOT EXISTS indexer_cursor (
    id INTEGER PRIMARY KEY DEFAULT 1,
    last_sequence_number BIGINT NOT NULL DEFAULT 0,
    last_version BIGINT NOT NULL DEFAULT 0,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Initialize cursor
INSERT INTO indexer_cursor (id, last_sequence_number, last_version) VALUES (1, 0, 0)
ON CONFLICT (id) DO NOTHING;

-- Indexes for fast lookups
CREATE INDEX IF NOT EXISTS idx_markets_creator ON markets(creator);
CREATE INDEX IF NOT EXISTS idx_markets_resolved ON markets(resolved);
CREATE INDEX IF NOT EXISTS idx_markets_end_time ON markets(end_time);
CREATE INDEX IF NOT EXISTS idx_bets_bettor ON bets(bettor);
CREATE INDEX IF NOT EXISTS idx_bets_market_id ON bets(market_id);
CREATE INDEX IF NOT EXISTS idx_bets_claimed ON bets(claimed);
