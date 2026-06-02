#!/bin/bash
# =========================================================================
# 🚀 GOLDFIELD L1 BLOCKCHAIN NODE DEVOPS BOOTSTRAPPER (bootstrap.sh)
# =========================================================================
set -e

echo "===================================================="
echo "🐳 Bootstrapping GoldChain L1 Distributed Nodes..."
echo "===================================================="

# 1. Dependency Validation Checks
if ! command -v docker &> /dev/null; then
    echo "❌ Error: docker is not installed on this host server."
    exit 1
fi

if ! command -v docker-compose &> /dev/null; then
    echo "❌ Error: docker-compose is not installed on this host server."
    exit 1
fi

# 2. Cleanup Legacy Containers
echo "🧹 Cleaning up legacy container states..."
docker-compose down || true

# 3. Compile and Build Containers
echo "🏗️ Building goldchain-node workspace container images..."
docker-compose build

# 4. Spawning the mesh validators in background daemon mode
echo "🚀 Spawning a 3-validator BFT network..."
docker-compose up -d

# 5. Display Active Live Listening Endpoints
echo "✅ Testnet node cluster is fully bootstrapped!"
echo "----------------------------------------------------"
echo "Validator Node 0 Active RPC: http://localhost:8545"
echo "Validator Node 1 Active RPC: http://localhost:8546"
echo "Validator Node 2 Active RPC: http://localhost:8547"
echo "----------------------------------------------------"
docker-compose ps
