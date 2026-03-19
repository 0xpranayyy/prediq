export declare class Indexer {
    private aptos;
    private isRunning;
    constructor();
    start(): Promise<void>;
    stop(): void;
    private poll;
    private processEvent;
    private handleMarketCreated;
    private handleBetPlaced;
    private handleMarketResolved;
    private handleRewardClaimed;
}
export declare const indexer: Indexer;
//# sourceMappingURL=indexer.d.ts.map