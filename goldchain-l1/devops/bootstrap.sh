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

COMPOSE_CMD="docker compose"
if ! docker compose version &> /dev/null; then
    if command -v docker-compose &> /dev/null; then
        COMPOSE_CMD="docker-compose"
    else
        echo "❌ Error: Neither docker compose nor docker-compose is installed on this host server."
        exit 1
    fi
fi

echo "ℹ️ Using Compose command: $COMPOSE_CMD"

# 2. Cleanup Legacy Containers
echo "🧹 Cleaning up legacy container states..."
$COMPOSE_CMD down || true

# 3. Compile and Build Containers
echo "🏗️ Building goldchain-node workspace container images..."
$COMPOSE_CMD build

# 4. Spawning the mesh validators in background daemon mode
echo "🚀 Spawning a 3-validator BFT network..."
$COMPOSE_CMD up -d

# 5. Display Active Live Listening Endpoints
echo "✅ Testnet node cluster is fully bootstrapped!"
echo "----------------------------------------------------"
echo "Validator Node 0 Active RPC: http://localhost:8545"
echo "Validator Node 1 Active RPC: http://localhost:8546"
echo "Validator Node 2 Active RPC: http://localhost:8547"
echo "----------------------------------------------------"
$COMPOSE_CMD ps
