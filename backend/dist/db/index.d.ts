import { Pool, QueryResult } from 'pg';
declare const pool: Pool;
export declare function query(text: string, params?: any[]): Promise<QueryResult>;
export declare function initDB(): Promise<void>;
export declare function healthCheck(): Promise<boolean>;
export default pool;
//# sourceMappingURL=index.d.ts.map