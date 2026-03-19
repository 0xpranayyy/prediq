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
export declare function initializeDatabase(): Promise<void>;
export declare function upsertMarket(market: Omit<Market, 'id' | 'created_at' | 'updated_at'>): Promise<Market>;
export declare function insertBet(bet: Omit<Bet, 'id' | 'created_at' | 'updated_at'>): Promise<Bet>;
export declare function getMarkets(limit?: number, offset?: number): Promise<Market[]>;
export declare function getMarket(id: number): Promise<Market | null>;
export declare function getUserPortfolio(walletAddress: string): Promise<UserPortfolio>;
export declare function closePool(): Promise<void>;
export declare function upsertUser(user: Omit<User, 'created_at' | 'updated_at'>): Promise<User>;
export declare function getUser(walletAddress: string): Promise<User | null>;
//# sourceMappingURL=database.d.ts.map