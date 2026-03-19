"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const sqlite_1 = require("./db/sqlite");
const indexer_1 = require("./indexer");
const markets_1 = __importDefault(require("./routes/markets"));
const portfolio_1 = __importDefault(require("./routes/portfolio"));
const users_1 = __importDefault(require("./routes/users"));
const PORT = parseInt(process.env.PORT || '3001');
async function main() {
    try {
        console.log('[PREDIQ] Starting backend...');
        // 1. Initialize database schema
        await (0, sqlite_1.initDB)();
        // 2. Setup Express API
        const app = (0, express_1.default)();
        app.use((0, cors_1.default)());
        app.use(express_1.default.json());
        // Health check
        app.get('/api/health', async (_req, res) => {
            const dbOk = await (0, sqlite_1.healthCheck)();
            res.json({ status: dbOk ? 'ok' : 'degraded', db: dbOk, uptime: process.uptime() });
        });
        // Routes
        app.use('/api/markets', markets_1.default);
        app.use('/api/portfolio', portfolio_1.default);
        app.use('/api/users', users_1.default);
        app.listen(PORT, () => {
            console.log(`[API] Listening on http://localhost:${PORT}`);
        });
        // 3. Start blockchain indexer in background
        indexer_1.indexer.start();
        console.log('[PREDIQ] Backend fully started');
        // Graceful shutdown
        const shutdown = () => {
            console.log('[PREDIQ] Shutting down...');
            indexer_1.indexer.stop();
            process.exit(0);
        };
        process.on('SIGINT', shutdown);
        process.on('SIGTERM', shutdown);
    }
    catch (error) {
        console.error('[PREDIQ] Failed to start:', error);
        process.exit(1);
    }
}
main().catch(console.error);
//# sourceMappingURL=index.js.map