import dotenv from 'dotenv';
dotenv.config();

import express from 'express';
import cors from 'cors';
import { initDB, healthCheck } from './db/sqlite';
import { indexer } from './indexer';
import marketsRouter from './routes/markets';
import portfolioRouter from './routes/portfolio';
import usersRouter from './routes/users';

const PORT = parseInt(process.env.PORT || '3001');

async function main(): Promise<void> {
  try {
    console.log('[PREDIQ] Starting backend...');

    // 1. Initialize database schema
    await initDB();

    // 2. Setup Express API
    const app = express();
    app.use(cors());
    app.use(express.json());

    // Health check
    app.get('/api/health', async (_req, res) => {
      const dbOk = await healthCheck();
      res.json({ status: dbOk ? 'ok' : 'degraded', db: dbOk, uptime: process.uptime() });
    });

    // Routes
    app.use('/api/markets', marketsRouter);
    app.use('/api/portfolio', portfolioRouter);
    app.use('/api/users', usersRouter);

    app.listen(PORT, () => {
      console.log(`[API] Listening on http://localhost:${PORT}`);
    });

    // 3. Start blockchain indexer in background
    indexer.start();

    console.log('[PREDIQ] Backend fully started');

    // Graceful shutdown
    const shutdown = () => {
      console.log('[PREDIQ] Shutting down...');
      indexer.stop();
      process.exit(0);
    };
    process.on('SIGINT', shutdown);
    process.on('SIGTERM', shutdown);

  } catch (error) {
    console.error('[PREDIQ] Failed to start:', error);
    process.exit(1);
  }
}

main().catch(console.error);
