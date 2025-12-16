#!/bin/bash

# ============================================
# Development Environment Setup Script
# ============================================

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

log_info() { echo -e "${BLUE}[INFO]${NC} $1"; }
log_success() { echo -e "${GREEN}[SUCCESS]${NC} $1"; }
log_warning() { echo -e "${YELLOW}[WARNING]${NC} $1"; }
log_error() { echo -e "${RED}[ERROR]${NC} $1"; }

cd "$(dirname "$0")/.."

log_info "Setting up development environment..."

# Check prerequisites
log_info "Checking prerequisites..."

if ! command -v docker &> /dev/null; then
    log_error "Docker is not installed."
    exit 1
fi

if ! command -v node &> /dev/null; then
    log_error "Node.js is not installed."
    exit 1
fi

# Create .env if it doesn't exist
if [[ ! -f ".env" ]]; then
    log_info "Creating .env file..."
    cp .env.example .env
    log_success ".env file created from .env.example"
else
    log_info ".env file already exists"
fi

# Generate NEXTAUTH_SECRET if not set
if grep -q 'NEXTAUTH_SECRET="generate-a-secure-secret-key"' .env; then
    log_info "Generating NEXTAUTH_SECRET..."
    SECRET=$(openssl rand -base64 32)
    sed -i "s|NEXTAUTH_SECRET=\"generate-a-secure-secret-key\"|NEXTAUTH_SECRET=\"$SECRET\"|" .env
    log_success "NEXTAUTH_SECRET generated"
fi

# Start PostgreSQL with Docker
log_info "Starting PostgreSQL database..."
docker run -d \
    --name pmp_postgres_dev \
    -e POSTGRES_USER=postgres \
    -e POSTGRES_PASSWORD=password \
    -e POSTGRES_DB=paxala_media \
    -p 5432:5432 \
    postgres:16-alpine 2>/dev/null || {
        log_info "PostgreSQL container already exists, starting it..."
        docker start pmp_postgres_dev 2>/dev/null || true
    }

# Wait for PostgreSQL to be ready
log_info "Waiting for PostgreSQL to be ready..."
sleep 3

for i in {1..30}; do
    if docker exec pmp_postgres_dev pg_isready -U postgres &> /dev/null; then
        log_success "PostgreSQL is ready!"
        break
    fi
    sleep 1
done

# Install dependencies
log_info "Installing Node.js dependencies..."
npm install

# Generate Prisma client
log_info "Generating Prisma client..."
npm run db:generate

# Run database migrations
log_info "Running database migrations..."
npm run db:push

# Seed database (optional)
if [[ -f "prisma/seed.ts" ]]; then
    log_info "Seeding database..."
    npm run db:seed || log_warning "Database seeding skipped or failed"
fi

log_success "Development environment setup complete!"
echo ""
log_info "To start the development server, run:"
echo "  npm run dev"
echo ""
log_info "To view the database, run:"
echo "  npm run db:studio"
echo ""
log_info "PostgreSQL is running on localhost:5432"
log_info "  User: postgres"
log_info "  Password: password"
log_info "  Database: paxala_media"
