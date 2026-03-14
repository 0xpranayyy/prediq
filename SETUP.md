# PREDIQ — Full Setup Guide

Complete guide to set up the smart contract, database, backend API, and frontend for a fully functional prediction market.

---

## Prerequisites

| Tool | Version | Install |
|------|---------|---------|
| **Node.js** | 18+ | [nodejs.org](https://nodejs.org) |
| **PostgreSQL** | 14+ | [postgresql.org](https://www.postgresql.org/download/) |
| **Aptos CLI** | latest | `curl -fsSL "https://aptos.dev/scripts/install_cli.py" \| python3` |
| **Git** | any | [git-scm.com](https://git-scm.com) |

---

## Step 1: Database Setup (PostgreSQL)

### 1a. Install PostgreSQL

**Windows** — Download installer from https://www.postgresql.org/download/windows/  
**macOS** — `brew install postgresql@16 && brew services start postgresql@16`  
**Linux** — `sudo apt install postgresql postgresql-contrib && sudo systemctl start postgresql`

### 1b. Create the database

```bash
# Open PostgreSQL shell
psql -U postgres

# Inside psql:
CREATE DATABASE prediq;
CREATE USER prediq_user WITH PASSWORD 'prediq_pass_123';
GRANT ALL PRIVILEGES ON DATABASE prediq TO prediq_user;
\q
```

### 1c. Run the schema migration

```bash
psql -U prediq_user -d prediq -f backend/src/db/schema.sql
```

This creates the `markets`, `bets`, and `indexer_cursor` tables with all necessary indexes.

---

## Step 2: Smart Contract Deployment (Aptos)

### 2a. Initialize Aptos profile

```bash
cd contracts

# Create a new Aptos account (saves to .aptos/config.yaml)
aptos init --network testnet
```

This will output your account address. **Save this address** — it becomes your `PREDICTION_MARKET_ADDRESS`.

### 2b. Fund your account

```bash
# Get testnet APT from faucet
aptos account fund-with-faucet --account default --amount 100000000
```

Or visit https://aptoslabs.com/testnet-faucet and paste your address.

### 2c. Update Move.toml with your address

Edit `contracts/Move.toml`:

```toml
[addresses]
prediction_market = "0xYOUR_ACCOUNT_ADDRESS_HERE"
admin = "0xYOUR_ACCOUNT_ADDRESS_HERE"
```

### 2d. Compile the contract

```bash
aptos move compile --named-addresses prediction_market=default,admin=default
```

### 2e. Run tests (optional but recommended)

```bash
aptos move test --named-addresses prediction_market=default,admin=default
```

### 2f. Deploy to testnet

```bash
aptos move publish \
  --named-addresses prediction_market=default,admin=default \
  --assume-yes
```

The output will show the **transaction hash**. Your contract is now live on Aptos testnet.

**Save the deployed address** — you'll need it for both backend and frontend config.

---

## Step 3: Backend Setup

### 3a. Install dependencies

```bash
cd backend
npm install
```

### 3b. Configure environment variables

Copy the example and fill in real values:

```bash
cp .env.example .env
```

Edit `backend/.env`:

```env
# Database — match what you created in Step 1
DB_HOST=localhost
DB_PORT=5432
DB_NAME=prediq
DB_USER=prediq_user
DB_PASSWORD=prediq_pass_123

# API server port
PORT=3001

# Aptos — from Step 2
APTOS_TESTNET_RPC=https://fullnode.testnet.aptoslabs.com/v1
APTOS_PRIVATE_KEY=your_private_key_from_aptos_init

# Contract address — from Step 2f deployment
PREDICTION_MARKET_ADDRESS=0xYOUR_DEPLOYED_ADDRESS

# Admin address (same as deployer for testnet)
ADMIN_ADDRESS=0xYOUR_DEPLOYED_ADDRESS
```

### 3c. Start the backend

```bash
# Development mode (auto-reload)
npm run dev

# Or production mode
npm run build
npm start
```

You should see:

```
[PREDIQ] Starting backend...
[DB] Schema initialized successfully
[API] Listening on http://localhost:3001
[Indexer] Started — polling on-chain events
[PREDIQ] Backend fully started
```

### 3d. Verify it works

```bash
curl http://localhost:3001/api/health
# → {"status":"ok","db":true,"uptime":1.23}

curl http://localhost:3001/api/markets
# → [] (empty array — no markets yet, this is correct!)
```

---

## Step 4: Frontend Setup

### 4a. Install dependencies

```bash
cd frontend
npm install
```

### 4b. Configure environment variables

Create `frontend/.env.local`:

```env
# Backend API URL
NEXT_PUBLIC_API_URL=http://localhost:3001

# Contract address — same as Step 2f
NEXT_PUBLIC_CONTRACT_ADDRESS=0xYOUR_DEPLOYED_ADDRESS

# Shelby storage
NEXT_PUBLIC_SHELBY_GATEWAY=https://gateway.shelby.xyz
NEXT_PUBLIC_SHELBY_API=https://api.shelby.xyz/v1
```

### 4c. Start the frontend

```bash
npm run dev
```

Open **http://localhost:3000** in your browser.

---

## Step 5: Connect & Test End-to-End

### 5a. Install a wallet

Install **Petra Wallet** (Chrome extension): https://petra.app  
Or **Pontem Wallet**: https://pontem.network

### 5b. Switch to Aptos Testnet

In your wallet settings, switch network to **Testnet**.

### 5c. Fund your wallet

Use the faucet: https://aptoslabs.com/testnet-faucet  
Paste your wallet address and request testnet APT.

### 5d. Test the full flow

1. **Connect wallet** — click "Connect Wallet" in the PREDIQ header
2. **Create a market** — click "+ Create Market", enter a question and end date
3. **Place a bet** — open the market, choose YES or NO, enter amount, confirm tx
4. **Check portfolio** — go to Portfolio page, see your active bet with tx links
5. **Check profile** — go to Profile page, see your prediction history
6. **Verify backend** — `curl http://localhost:3001/api/markets` should now show your market

---

## Architecture Overview

```
┌─────────────┐    ┌──────────────┐    ┌──────────────┐
│  Frontend    │───▶│  Backend API │───▶│  PostgreSQL  │
│  Next.js     │    │  Express     │    │  Database    │
│  :3000       │    │  :3001       │    │  :5432       │
└──────┬──────┘    └──────┬───────┘    └──────────────┘
       │                  │
       │   ┌──────────────┘
       │   │  Indexer (polls events)
       ▼   ▼
┌──────────────┐    ┌──────────────┐
│  Aptos       │    │  Shelby      │
│  Blockchain  │    │  Storage     │
│  (Testnet)   │    │  (Hot)       │
└──────────────┘    └──────────────┘
```

**Data flow:**
- User interacts with frontend → sends tx to Aptos blockchain
- Frontend stores metadata on Shelby → gets CID back
- Backend indexer polls Aptos events → writes to PostgreSQL
- Frontend reads from backend API → shows real live data

---

## Troubleshooting

### "No markets" on frontend
- Verify backend is running: `curl http://localhost:3001/api/health`
- Verify `NEXT_PUBLIC_API_URL` in `.env.local` points to backend
- Create a market first — the app shows only real on-chain data

### Database connection error
- Verify PostgreSQL is running: `pg_isready`
- Check credentials in `backend/.env` match what you created
- Run schema again: `psql -U prediq_user -d prediq -f backend/src/db/schema.sql`

### Contract deployment fails
- Ensure account is funded: `aptos account balance --account default`
- Check Move.toml addresses match your account
- Try `aptos move compile` first to catch errors

### Wallet won't connect
- Make sure wallet is on **Testnet** network
- Try refreshing the page after switching networks
- Clear browser cache if switching between wallets

### Indexer not picking up events
- Check `PREDICTION_MARKET_ADDRESS` in backend `.env` matches deployed contract
- The indexer polls every 5 seconds — wait a moment after creating a market
- Check backend console logs for `[Indexer]` messages

---

## Quick Start (TL;DR)

```bash
# 1. Database
psql -U postgres -c "CREATE DATABASE prediq;"
psql -U postgres -d prediq -f backend/src/db/schema.sql

# 2. Smart Contract
cd contracts
aptos init --network testnet
aptos account fund-with-faucet --account default --amount 100000000
aptos move publish --named-addresses prediction_market=default,admin=default --assume-yes
# Note the deployed address from output

# 3. Backend
cd ../backend
npm install
cp .env.example .env
# Edit .env with your DB creds + contract address
npm run dev

# 4. Frontend
cd ../frontend
npm install
# Create .env.local with NEXT_PUBLIC_API_URL=http://localhost:3001
#                        NEXT_PUBLIC_CONTRACT_ADDRESS=0xYOUR_ADDRESS
npm run dev

# 5. Open http://localhost:3000, connect wallet, start predicting!
```
