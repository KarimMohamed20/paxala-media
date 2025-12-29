#!/bin/bash

# ============================================
# Fix Docker Network Issues
# ============================================

set -e

echo "🔧 Fixing Docker network issues..."
echo ""

# Stop all containers
echo "📦 Stopping all containers..."
cd "$(dirname "$0")/.."
docker compose -f docker-compose.yml --env-file .env.production down 2>/dev/null || true

# Remove orphaned networks
echo "🌐 Cleaning up orphaned networks..."
docker network prune -f

# Remove the specific network if it exists
echo "🗑️  Removing pmp_network if it exists..."
docker network rm pmp_network 2>/dev/null || true

# Recreate the network
echo "✨ Recreating pmp_network..."
docker network create pmp_network

echo ""
echo "✅ Network issues fixed!"
echo ""
echo "Now run: ./scripts/deploy.sh start"
