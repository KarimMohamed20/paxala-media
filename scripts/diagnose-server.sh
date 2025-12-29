#!/bin/bash

# ============================================
# Server Diagnostic Script for Docker Build Issues
# ============================================

set -e

echo "==================================================="
echo "Server Resource Diagnostic for Docker Build Issues"
echo "==================================================="
echo ""

# Check available memory
echo "📊 Memory Usage:"
echo "----------------"
free -h
echo ""

# Check available disk space
echo "💾 Disk Space:"
echo "----------------"
df -h /
echo ""

# Check Docker disk usage
echo "🐳 Docker Disk Usage:"
echo "----------------"
docker system df
echo ""

# Check running containers
echo "📦 Running Containers:"
echo "----------------"
docker ps
echo ""

# Check Docker memory limit
echo "🔧 Docker Memory Limit:"
echo "----------------"
docker info | grep -i memory
echo ""

# Check for zombie processes
echo "👻 Zombie Processes:"
echo "----------------"
ps aux | awk '$8=="Z"' || echo "None found"
echo ""

# Check system load
echo "⚡ System Load:"
echo "----------------"
uptime
echo ""

# Recommendations
echo "==================================================="
echo "💡 Recommendations:"
echo "==================================================="
echo ""
echo "If memory is low (<2GB available):"
echo "  - Consider adding swap space"
echo "  - Stop unnecessary services temporarily"
echo "  - Build during off-peak hours"
echo ""
echo "If disk space is low (<5GB available):"
echo "  - Clean Docker: docker system prune -a --volumes"
echo "  - Remove old logs and backups"
echo ""
echo "If builds are hanging:"
echo "  - The updated deploy.sh now uses BuildKit and removed --no-cache"
echo "  - The Dockerfile now has increased memory limit for builds"
echo "  - Try building with: ./scripts/deploy.sh build"
echo ""
