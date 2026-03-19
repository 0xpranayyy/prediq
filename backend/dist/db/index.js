"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.query = query;
exports.initDB = initDB;
exports.healthCheck = healthCheck;
const pg_1 = require("pg");
const dotenv_1 = __importDefault(require("dotenv"));
const path_1 = __importDefault(require("path"));
const fs_1 = __importDefault(require("fs"));
dotenv_1.default.config();
const pool = new pg_1.Pool({
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432'),
    database: process.env.DB_NAME || 'prediq',
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || 'password',
});
pool.on('error', (err) => {
    console.error('[DB] Unexpected pool error:', err);
});
async function query(text, params) {
    const start = Date.now();
    const result = await pool.query(text, params);
    const duration = Date.now() - start;
    if (duration > 200) {
        console.warn(`[DB] Slow query (${duration}ms):`, text.slice(0, 80));
    }
    return result;
}
async function initDB() {
    try {
        const schemaPath = path_1.default.join(__dirname, 'schema.sql');
        const schema = fs_1.default.readFileSync(schemaPath, 'utf-8');
        await pool.query(schema);
        console.log('[DB] Schema initialized successfully');
    }
    catch (err) {
        console.error('[DB] Schema initialization failed:', err);
        throw err;
    }
}
async function healthCheck() {
    try {
        await pool.query('SELECT 1');
        return true;
    }
    catch {
        return false;
    }
}
exports.default = pool;
//# sourceMappingURL=index.js.map