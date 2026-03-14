#!/bin/bash

# PREDIQ - Local Development Setup Script
# This script sets up the complete development environment

set -e

echo "🛠️  Setting up PREDIQ local development environment..."

# Check if Node.js is installed
command -v node >/dev/null 2>&1 || { echo "❌ Node.js is not installed. Please install it first."; exit 1; }
command -v npm >/dev/null 2>&1 || { echo "❌ npm is not installed. Please install it first."; exit 1; }

# Check if PostgreSQL is installed
command -v psql >/dev/null 2>&1 || { echo "❌ PostgreSQL is not installed. Please install it first."; exit 1; }

echo "✅ Prerequisites check passed"

# Setup backend
echo "📦 Setting up backend..."
cd backend
npm install

# Create .env file if it doesn't exist
if [ ! -f .env ]; then
    echo "📝 Creating backend .env file..."
    cp .env.example .env
    echo "⚠️  Please update backend/.env with your configuration"
fi

# Setup database
echo "🗄️  Setting up database..."
createdb prediq 2>/dev/null || echo "Database 'prediq' already exists"

# Setup frontend
echo "📦 Setting up frontend..."
cd ../frontend
npm install

# Create .env.local file if it doesn't exist
if [ ! -f .env.local ]; then
    echo "📝 Creating frontend .env.local file..."
    cat > .env.local << EOF
NEXT_PUBLIC_API_URL=http://localhost:3001
NEXT_PUBLIC_GRAPHQL_URL=http://localhost:3001/graphql
NEXT_PUBLIC_APTOS_NETWORK=testnet
NEXT_PUBLIC_CONTRACT_ADDRESS=0x1
EOF
fi

# Go back to root
cd ..

echo "🔧 Installing Move CLI tools..."
# Check if aptos CLI is installed
if ! command -v aptos &> /dev/null; then
    echo "📦 Installing Aptos CLI..."
    curl -fsSL https://aptos.dev/scripts/install.sh | sh
else
    echo "✅ Aptos CLI already installed"
fi

# Make scripts executable
echo "🔧 Making deployment scripts executable..."
chmod +x scripts/*.sh

echo "🎉 Local development environment setup completed!"
echo ""
echo "📋 Next steps:"
echo "1. Update backend/.env with your database and API configuration"
echo "2. Update frontend/.env.local with your contract addresses"
echo "3. Start PostgreSQL: brew services start postgresql (macOS) or sudo systemctl start postgresql (Linux)"
echo "4. Start backend: cd backend && npm run dev"
echo "5. Start frontend: cd frontend && npm run dev"
echo ""
echo "🔗 Useful commands:"
echo "   - Deploy to Aptos: ./scripts/deploy-aptos.sh"
echo "   - Deploy to Shelby: ./scripts/deploy-shelby.sh"
echo "   - Start backend: cd backend && npm run dev"
echo "   - Start frontend: cd frontend && npm run dev"
