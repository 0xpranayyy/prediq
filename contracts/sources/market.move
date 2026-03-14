module prediction_market::market {
    use std::signer;
    use std::vector;
    use std::event;
    use std::timestamp;
    use aptos_framework::coin;
    use aptos_framework::aptos_coin::AptosCoin;

    const E_NOT_ADMIN: u64 = 1;
    const E_MARKET_NOT_FOUND: u64 = 2;
    const E_MARKET_ALREADY_RESOLVED: u64 = 3;
    const E_MARKET_NOT_EXPIRED: u64 = 4;
    const E_MARKET_NOT_RESOLVED: u64 = 5;
    const E_INVALID_AMOUNT: u64 = 6;
    const E_INSUFFICIENT_BALANCE: u64 = 7;
    const E_NO_BETS: u64 = 8;
    const E_ALREADY_CLAIMED: u64 = 9;

    struct Market has key, store {
        id: u64,
        question: vector<u8>,
        creator: address,
        yes_pool: u64,
        no_pool: u64,
        end_time: u64,
        resolved: bool,
        outcome: bool,
        total_yes_bets: u64,
        total_no_bets: u64,
    }

    struct Bet has key, store {
        bettor: address,
        market_id: u64,
        amount: u64,
        side: bool,
        claimed: bool,
    }

    #[event]
    struct MarketCreated has drop, store {
        market_id: u64,
        creator: address,
        question: vector<u8>,
        end_time: u64,
    }

    #[event]
    struct BetPlaced has drop, store {
        market_id: u64,
        bettor: address,
        amount: u64,
        side: bool,
        new_yes_pool: u64,
        new_no_pool: u64,
    }

    #[event]
    struct MarketResolved has drop, store {
        market_id: u64,
        outcome: bool,
    }

    #[event]
    struct RewardClaimed has drop, store {
        market_id: u64,
        bettor: address,
        amount: u64,
    }

    struct Markets has key {
        count: u64,
        markets: vector<Market>,
    }

    struct UserBets has key {
        bets: vector<Bet>,
    }

    #[view]
    public fun get_market_count(): u64 acquires Markets {
        borrow_global<Markets>(@prediction_market).count
    }

    #[view]
    public fun get_market(market_id: u64): Market acquires Markets {
        let markets = &borrow_global<Markets>(@prediction_market).markets;
        let market = vector::borrow(markets, market_id - 1);
        Market {
            id: market.id,
            question: market.question,
            creator: market.creator,
            yes_pool: market.yes_pool,
            no_pool: market.no_pool,
            end_time: market.end_time,
            resolved: market.resolved,
            outcome: market.outcome,
            total_yes_bets: market.total_yes_bets,
            total_no_bets: market.total_no_bets,
        }
    }

    #[view]
    public fun calculate_yes_probability(yes_pool: u64, no_pool: u64): u64 {
        let total_pool = yes_pool + no_pool;
        if (total_pool == 0) {
            5000 // 50% default
        } else {
            (yes_pool * 10000) / total_pool
        }
    }

    #[view]
    public fun calculate_reward(user_bet: u64, pool_side: u64, total_pool: u64): u64 {
        if (pool_side == 0) {
            0
        } else {
            (user_bet * total_pool) / pool_side
        }
    }

    public entry fun create_market(
        creator: &signer,
        question: vector<u8>,
        end_time: u64,
    ) acquires Markets {
        let creator_addr = signer::address_of(creator);
        
        if (!exists<Markets>(@prediction_market)) {
            move_to(creator, Markets {
                count: 0,
                markets: vector::empty(),
            });
        }

        let markets_ref = borrow_global_mut<Markets>(@prediction_market);
        let market_id = markets_ref.count + 1;
        
        let market = Market {
            id: market_id,
            question,
            creator: creator_addr,
            yes_pool: 0,
            no_pool: 0,
            end_time,
            resolved: false,
            outcome: false,
            total_yes_bets: 0,
            total_no_bets: 0,
        };

        vector::push_back(&mut markets_ref.markets, market);
        markets_ref.count = market_id;

        event::emit(MarketCreated {
            market_id,
            creator: creator_addr,
            question: vector::empty(), // Will be populated in actual implementation
            end_time,
        });
    }

    public entry fun bet_yes(
        bettor: &signer,
        market_id: u64,
        amount: u64,
    ) acquires Markets, UserBets {
        let bettor_addr = signer::address_of(bettor);
        
        // Validation
        assert!(amount > 0, E_INVALID_AMOUNT);
        assert!(coin::balance<AptosCoin>(bettor_addr) >= amount, E_INSUFFICIENT_BALANCE);
        
        let markets_ref = borrow_global_mut<Markets>(@prediction_market);
        let market = vector::borrow_mut(&mut markets_ref.markets, market_id - 1);
        
        assert!(!market.resolved, E_MARKET_ALREADY_RESOLVED);
        assert!(timestamp::now_seconds() < market.end_time, E_MARKET_NOT_EXPIRED);
        
        // Transfer coins to contract
        coin::transfer<AptosCoin>(bettor, @prediction_market, amount);
        
        // Update market pools
        market.yes_pool = market.yes_pool + amount;
        market.total_yes_bets = market.total_yes_bets + amount;
        
        // Record bet
        if (!exists<UserBets>(bettor_addr)) {
            move_to(bettor, UserBets {
                bets: vector::empty(),
            });
        }
        
        let user_bets_ref = borrow_global_mut<UserBets>(bettor_addr);
        let bet = Bet {
            bettor: bettor_addr,
            market_id,
            amount,
            side: true,
            claimed: false,
        };
        
        vector::push_back(&mut user_bets_ref.bets, bet);
        
        event::emit(BetPlaced {
            market_id,
            bettor: bettor_addr,
            amount,
            side: true,
            new_yes_pool: market.yes_pool,
            new_no_pool: market.no_pool,
        });
    }

    public entry fun bet_no(
        bettor: &signer,
        market_id: u64,
        amount: u64,
    ) acquires Markets, UserBets {
        let bettor_addr = signer::address_of(bettor);
        
        // Validation
        assert!(amount > 0, E_INVALID_AMOUNT);
        assert!(coin::balance<AptosCoin>(bettor_addr) >= amount, E_INSUFFICIENT_BALANCE);
        
        let markets_ref = borrow_global_mut<Markets>(@prediction_market);
        let market = vector::borrow_mut(&mut markets_ref.markets, market_id - 1);
        
        assert!(!market.resolved, E_MARKET_ALREADY_RESOLVED);
        assert!(timestamp::now_seconds() < market.end_time, E_MARKET_NOT_EXPIRED);
        
        // Transfer coins to contract
        coin::transfer<AptosCoin>(bettor, @prediction_market, amount);
        
        // Update market pools
        market.no_pool = market.no_pool + amount;
        market.total_no_bets = market.total_no_bets + amount;
        
        // Record bet
        if (!exists<UserBets>(bettor_addr)) {
            move_to(bettor, UserBets {
                bets: vector::empty(),
            });
        }
        
        let user_bets_ref = borrow_global_mut<UserBets>(bettor_addr);
        let bet = Bet {
            bettor: bettor_addr,
            market_id,
            amount,
            side: false,
            claimed: false,
        };
        
        vector::push_back(&mut user_bets_ref.bets, bet);
        
        event::emit(BetPlaced {
            market_id,
            bettor: bettor_addr,
            amount,
            side: false,
            new_yes_pool: market.yes_pool,
            new_no_pool: market.no_pool,
        });
    }

    public entry fun resolve_market(
        admin: &signer,
        market_id: u64,
        outcome: bool,
    ) acquires Markets {
        let admin_addr = signer::address_of(admin);
        assert!(admin_addr == @admin, E_NOT_ADMIN);
        
        let markets_ref = borrow_global_mut<Markets>(@prediction_market);
        let market = vector::borrow_mut(&mut markets_ref.markets, market_id - 1);
        
        assert!(!market.resolved, E_MARKET_ALREADY_RESOLVED);
        assert!(timestamp::now_seconds() >= market.end_time, E_MARKET_NOT_EXPIRED);
        
        market.resolved = true;
        market.outcome = outcome;
        
        event::emit(MarketResolved {
            market_id,
            outcome,
        });
    }

    public entry fun claim_reward(
        claimer: &signer,
        market_id: u64,
    ) acquires Markets, UserBets {
        let claimer_addr = signer::address_of(claimer);
        
        let markets_ref = borrow_global<Markets>(@prediction_market);
        let market = vector::borrow(&markets_ref.markets, market_id - 1);
        
        assert!(market.resolved, E_MARKET_NOT_RESOLVED);
        
        let user_bets_ref = borrow_global_mut<UserBets>(claimer_addr);
        let bet_found = false;
        let reward_amount = 0u64;
        
        let i = 0;
        let len = vector::length(&user_bets_ref.bets);
        while (i < len) {
            let bet = vector::borrow_mut(&mut user_bets_ref.bets, i);
            if (bet.market_id == market_id && !bet.claimed) {
                bet_found = true;
                assert!(!bet.claimed, E_ALREADY_CLAIMED);
                
                if (bet.side == market.outcome) {
                    // Winning bet
                    let pool_side = if (bet.side) market.yes_pool else market.no_pool;
                    let total_pool = market.yes_pool + market.no_pool;
                    reward_amount = calculate_reward(bet.amount, pool_side, total_pool);
                }
                
                bet.claimed = true;
                break;
            };
            i = i + 1;
        };
        
        assert!(bet_found, E_NO_BETS);
        
        if (reward_amount > 0) {
            coin::transfer<AptosCoin>(claimer, claimer_addr, reward_amount);
            event::emit(RewardClaimed {
                market_id,
                bettor: claimer_addr,
                amount: reward_amount,
            });
        }
    }

    #[test(admin = @0x2, creator = @0x3)]
    public entry fun test_create_market(admin: &signer, creator: &signer) acquires Markets {
        account::create_account_for_test(signer::address_of(creator));
        create_market(creator, b"Will BTC reach $100k by end of year?", 1735689600);
        assert!(get_market_count() == 1, 100);
    }

    #[test(admin = @0x2, creator = @0x3, bettor = @0x4)]
    public entry fun test_full_flow(admin: &signer, creator: &signer, bettor: &signer) acquires Markets, UserBets {
        account::create_account_for_test(signer::address_of(creator));
        account::create_account_for_test(signer::address_of(bettor));
        account::create_account_for_test(@prediction_market);
        
        // Mint coins for testing
        coin::register<AptosCoin>(bettor);
        coin::mint<AptosCoin>(bettor, 1000000);
        
        create_market(creator, b"Test market", 1735689600);
        
        let market_id = 1;
        bet_yes(bettor, market_id, 1000);
        
        let market = get_market(market_id);
        assert!(market.yes_pool == 1000, 101);
        assert!(market.no_pool == 0, 102);
    }
}
