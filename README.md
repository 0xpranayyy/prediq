# PREDIQ - Decentralized Prediction Markets

A complete decentralized prediction market platform built on Aptos and Shelby blockchains, similar to Polymarket. Users can create prediction markets, bet on outcomes, and earn rewards based on their predictions.

## 🚀 Features

- **Decentralized**: Built on blockchain technology for transparency and security
- **Multi-Chain**: Supports both Aptos and Shelby testnets
- **Real-time Odds**: Dynamic probability calculations based on market activity
- **Smart Contracts**: Secure and automated betting and reward distribution
- **Modern UI**: Beautiful and intuitive web interface
- **Wallet Integration**: Support for popular Aptos wallets (Petra, Pontem, Martian)
- **Event Indexing**: Real-time blockchain event processing
- **GraphQL API**: Efficient data querying and management

## 📁 Project Structure

```
prediction-market/
├── contracts/                 # Move smart contracts
│   ├── Move.toml             # Package configuration
│   └── sources/
│       └── market.move       # Main prediction market contract
├── backend/                  # Node.js backend services
│   ├── src/
│   │   ├── database.ts       # PostgreSQL database operations
│   │   ├── indexer.ts        # Blockchain event indexer
│   │   ├── api.ts            # REST and GraphQL API
│   │   └── index.ts          # Main server entry point
│   ├── package.json
│   └── .env.example
├── frontend/                 # Next.js web application
│   ├── pages/
│   │   ├── index.tsx         # Home page
│   │   ├── markets.tsx       # Markets listing
│   │   └── market/[id].tsx   # Individual market page
│   ├── components/
│   │   ├── WalletConnect.tsx # Wallet connection component
│   │   ├── MarketCard.tsx     # Market display card
│   │   └── BetPanel.tsx       # Betting interface
│   ├── types/
│   │   └── index.ts          # TypeScript type definitions
│   └── styles/
│       └── globals.css       # Global styles
├── scripts/                  # Deployment and setup scripts
│   ├── deploy-aptos.sh       # Aptos deployment script
│   ├── deploy-shelby.sh      # Shelby deployment script
│   └── setup-local.sh        # Local development setup
└── README.md
```

## 🛠️ Tech Stack

### Smart Contracts
- **Move Language**: Smart contract development
- **Aptos Framework**: Core blockchain functionality
- **Shelby Compatibility**: Cross-chain support

### Backend
- **Node.js**: Runtime environment
- **TypeScript**: Type-safe development
- **PostgreSQL**: Database management
- **GraphQL**: Efficient API queries
- **Express.js**: Web server framework
- **Aptos SDK**: Blockchain interaction

### Frontend
- **Next.js**: React framework
- **TypeScript**: Type-safe development
- **TailwindCSS**: Utility-first styling
- **Aptos Wallet Adapter**: Wallet integration
- **React**: UI components

## 🚀 Quick Start

### Prerequisites

- Node.js (v18 or higher)
- PostgreSQL
- Aptos CLI
- Shelby CLI (for Shelby deployment)

### Local Development Setup

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd prediction-market
   ```

2. **Run the setup script**
   ```bash
   chmod +x scripts/setup-local.sh
   ./scripts/setup-local.sh
   ```

3. **Configure environment variables**
   
   **Backend** (`backend/.env`):
   ```env
   DB_HOST=localhost
   DB_PORT=5432
   DB_NAME=prediq
   DB_USER=postgres
   DB_PASSWORD=password
   PORT=3001
   
   APTOS_TESTNET_RPC=https://fullnode.testnet.aptoslabs.com/v1
   SHELBY_TESTNET_RPC=https://rpc.shelby.xyz/v1
   
   PREDICTION_MARKET_ADDRESS=0x1
   ADMIN_ADDRESS=0x2
   ```

   **Frontend** (`frontend/.env.local`):
   ```env
   NEXT_PUBLIC_API_URL=http://localhost:3001
   NEXT_PUBLIC_GRAPHQL_URL=http://localhost:3001/graphql
   NEXT_PUBLIC_APTOS_NETWORK=testnet
   NEXT_PUBLIC_CONTRACT_ADDRESS=0x1
   ```

4. **Start the development servers**
   
   **Terminal 1 - Backend**:
   ```bash
   cd backend
   npm run dev
   ```

   **Terminal 2 - Frontend**:
   ```bash
   cd frontend
   npm run dev
   ```

5. **Access the application**
   - Frontend: http://localhost:3000
   - Backend API: http://localhost:3001
   - GraphQL Playground: http://localhost:3001/graphql

## 🔗 Deployment

### Deploy to Aptos Testnet

1. **Set environment variables**
   ```bash
   export APTOS_PRIVATE_KEY=your_private_key
   export ADMIN_ADDRESS=your_admin_address
   ```

2. **Run the deployment script**
   ```bash
   chmod +x scripts/deploy-aptos.sh
   ./scripts/deploy-aptos.sh
   ```

### Deploy to Shelby Testnet

1. **Set environment variables**
   ```bash
   export SHELBY_PRIVATE_KEY=your_private_key
   export ADMIN_ADDRESS=your_admin_address
   ```

2. **Run the deployment script**
   ```bash
   chmod +x scripts/deploy-shelby.sh
   ./scripts/deploy-shelby.sh
   ```

## 📱 Smart Contract Functions

### Core Functions

- **`create_market(question, end_time)`**: Creates a new prediction market
- **`bet_yes(market_id, amount)`**: Places a YES bet on a market
- **`bet_no(market_id, amount)`**: Places a NO bet on a market
- **`resolve_market(market_id, outcome)`**: Resolves a market outcome (admin only)
- **`claim_reward(market_id)`**: Claims winnings for winning bets

### Data Structures

```move
struct Market {
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

struct Bet {
    bettor: address,
    market_id: u64,
    amount: u64,
    side: bool,
    claimed: bool,
}
```

## 🎯 How It Works

1. **Market Creation**: Users create prediction markets with questions and end times
2. **Betting**: Users bet YES or NO by depositing tokens
3. **Odds Calculation**: Real-time probability based on pool sizes
   - YES probability = yes_pool / (yes_pool + no_pool)
4. **Market Resolution**: Admin resolves markets when real-world outcomes are known
5. **Reward Distribution**: Winners claim proportional rewards from the losing pool

### Payout Formula

```
If YES wins:
reward = (user_bet / total_yes_pool) * (yes_pool + no_pool)

If NO wins:
reward = (user_bet / total_no_pool) * (yes_pool + no_pool)
```

## 🔌 API Endpoints

### REST API

- `GET /api/health` - Health check
- `GET /api/markets` - List all markets
- `GET /api/markets/:id` - Get specific market
- `GET /api/portfolio/:walletAddress` - Get user portfolio

### GraphQL API

```graphql
query Markets($limit: Int, $offset: Int) {
  markets(limit: $limit, offset: $offset) {
    id
    question
    creator
    yesPool
    noPool
    endTime
    resolved
    outcome
    yesProbability
  }
}

query Market($id: ID!) {
  market(id: $id) {
    id
    question
    yesPool
    noPool
    yesProbability
  }
}

query Portfolio($walletAddress: String!) {
  portfolio(walletAddress: $walletAddress) {
    totalInvested
    totalWinnings
    activeBets {
      marketId
      amount
      side
    }
    claimedBets {
      marketId
      amount
      side
    }
  }
}
```

## 🧪 Testing

### Smart Contract Tests

```bash
cd contracts
aptos move test --named-addresses prediction_market=0x1,admin=0x2
```

### Backend Tests

```bash
cd backend
npm test
```

### Frontend Tests

```bash
cd frontend
npm test
```

## 🔧 Configuration

### Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `DB_HOST` | Database host | `localhost` |
| `DB_PORT` | Database port | `5432` |
| `DB_NAME` | Database name | `prediq` |
| `DB_USER` | Database user | `postgres` |
| `DB_PASSWORD` | Database password | `password` |
| `PORT` | Backend server port | `3001` |
| `APTOS_TESTNET_RPC` | Aptos RPC URL | `https://fullnode.testnet.aptoslabs.com/v1` |
| `SHELBY_TESTNET_RPC` | Shelby RPC URL | `https://rpc.shelby.xyz/v1` |
| `PREDICTION_MARKET_ADDRESS` | Contract address | `0x1` |
| `ADMIN_ADDRESS` | Admin address | `0x2` |

## 🚨 Security Considerations

- **Market Expiration**: Markets automatically expire after end_time
- **Admin Role**: Only admin can resolve markets
- **Input Validation**: All inputs are validated in smart contracts
- **Reentrancy Protection**: Smart contracts are reentrancy-safe
- **Safe Math**: Arithmetic operations use safe math practices

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🔗 Useful Links

- **Aptos Documentation**: https://aptos.dev/
- **Shelby Documentation**: https://docs.shelby.xyz/
- **Aptos Explorer**: https://explorer.apt.dev/
- **Shelby Explorer**: https://explorer.shelby.xyz/
- **Aptos Faucet**: https://apt.dev/faucet/
- **Shelby Faucet**: https://faucet.shelby.xyz/

## 🆘 Support

If you encounter any issues or have questions:

1. Check the [FAQ](docs/FAQ.md)
2. Search existing [Issues](../../issues)
3. Create a new [Issue](../../issues/new)
4. Join our [Discord](https://discord.gg/prediq)

---

**Built with ❤️ for the decentralized future**
