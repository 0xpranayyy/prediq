#!/bin/bash

# PREDIQ - Aptos Testnet Deployment Script
# This script compiles and deploys the prediction market smart contract to Aptos Testnet

set -e

echo "🚀 Starting PREDIQ deployment to Aptos Testnet..."

# Check if required tools are installed
command -v aptos >/dev/null 2>&1 || { echo "❌ aptos CLI is not installed. Please install it first."; exit 1; }

# Configuration
NETWORK="testnet"
CONTRACT_DIR="../contracts"
PRIVATE_KEY=${APTOS_PRIVATE_KEY}
ADMIN_ADDRESS=${ADMIN_ADDRESS}

if [ -z "$PRIVATE_KEY" ]; then
    echo "❌ APTOS_PRIVATE_KEY environment variable is not set"
    echo "Please set it: export APTOS_PRIVATE_KEY=your_private_key"
    exit 1
fi

if [ -z "$ADMIN_ADDRESS" ]; then
    echo "❌ ADMIN_ADDRESS environment variable is not set"
    echo "Please set it: export ADMIN_ADDRESS=your_admin_address"
    exit 1
fi

echo "📁 Contract directory: $CONTRACT_DIR"
echo "🌐 Network: $NETWORK"
echo "👤 Admin address: $ADMIN_ADDRESS"

# Change to contract directory
cd "$CONTRACT_DIR"

echo "🔨 Compiling Move contract..."
aptos move compile \
    --named-addresses prediction_market=$ADMIN_ADDRESS,admin=$ADMIN_ADDRESS \
    --package-dir . \
    --assume-yes

if [ $? -ne 0 ]; then
    echo "❌ Contract compilation failed"
    exit 1
fi

echo "✅ Contract compiled successfully"

echo "📤 Publishing contract to Aptos Testnet..."
aptos move publish \
    --named-addresses prediction_market=$ADMIN_ADDRESS,admin=$ADMIN_ADDRESS \
    --package-dir . \
    --profile $NETWORK \
    --assume-yes

if [ $? -ne 0 ]; then
    echo "❌ Contract deployment failed"
    exit 1
fi

echo "✅ Contract deployed successfully to Aptos Testnet!"
echo "📍 Contract address: $ADMIN_ADDRESS"
echo "🔗 Explorer: https://explorer.apt.dev/txn/$LAST_TXN?network=testnet"

# Save deployment info
echo "💾 Saving deployment info..."
cat > ../backend/aptos-deployment.json << EOF
{
    "network": "testnet",
    "contract_address": "$ADMIN_ADDRESS",
    "admin_address": "$ADMIN_ADDRESS",
    "transaction_hash": "$LAST_TXN",
    "deployed_at": "$(date -u +%Y-%m-%dT%H:%M:%SZ)"
}
EOF

echo "🎉 PREDIQ deployment to Aptos Testnet completed successfully!"
echo ""
echo "📋 Next steps:"
echo "1. Update the backend indexer to use the new contract address"
echo "2. Update the frontend environment variables"
echo "3. Test the deployment by creating a test market"
echo ""
echo "🔗 Useful links:"
echo "   - Explorer: https://explorer.apt.dev/account/$ADMIN_ADDRESS?network=testnet"
echo "   - Faucet: https://apt.dev/faucet?network=testnet"
