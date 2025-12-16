#!/bin/bash

# ============================================
# Paxala Media Production - Deployment Script
# ============================================

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
PROJECT_NAME="paxala-media"
COMPOSE_FILE="docker-compose.yml"
ENV_FILE=".env.production"

# Functions
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if running as root
check_root() {
    if [[ $EUID -eq 0 ]]; then
        log_warning "Running as root. Consider using a non-root user with docker group."
    fi
}

# Check prerequisites
check_prerequisites() {
    log_info "Checking prerequisites..."

    # Check Docker
    if ! command -v docker &> /dev/null; then
        log_error "Docker is not installed. Please install Docker first."
        exit 1
    fi

    # Check Docker Compose
    if ! command -v docker compose &> /dev/null && ! docker compose version &> /dev/null; then
        log_error "Docker Compose is not installed. Please install Docker Compose first."
        exit 1
    fi

    # Check if docker is running
    if ! docker info &> /dev/null; then
        log_error "Docker is not running. Please start Docker first."
        exit 1
    fi

    log_success "Prerequisites check passed."
}

# Check environment file
check_env() {
    log_info "Checking environment configuration..."

    if [[ ! -f "$ENV_FILE" ]]; then
        log_error "Environment file $ENV_FILE not found!"
        log_info "Please copy .env.production.example to .env.production and configure it."
        exit 1
    fi

    # Source environment file
    source "$ENV_FILE"

    # Check required variables
    if [[ -z "$NEXTAUTH_SECRET" || "$NEXTAUTH_SECRET" == "generate_a_secure_random_string_here" ]]; then
        log_error "NEXTAUTH_SECRET is not set properly in $ENV_FILE"
        log_info "Generate one with: openssl rand -base64 32"
        exit 1
    fi

    if [[ -z "$POSTGRES_PASSWORD" || "$POSTGRES_PASSWORD" == "your_super_secure_password_here" ]]; then
        log_error "POSTGRES_PASSWORD is not set properly in $ENV_FILE"
        exit 1
    fi

    log_success "Environment configuration check passed."
}

# Build images
build() {
    log_info "Building Docker images..."
    docker compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" build --no-cache
    log_success "Docker images built successfully."
}

# Start services
start() {
    log_info "Starting services..."
    docker compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" up -d
    log_success "Services started successfully."
}

# Stop services
stop() {
    log_info "Stopping services..."
    docker compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" down
    log_success "Services stopped."
}

# Restart services
restart() {
    stop
    start
}

# Run database migrations
migrate() {
    log_info "Running database migrations..."
    docker compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" --profile migrate up migrate
    log_success "Database migrations completed."
}

# View logs
logs() {
    local service="${1:-}"
    if [[ -z "$service" ]]; then
        docker compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" logs -f
    else
        docker compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" logs -f "$service"
    fi
}

# Check status
status() {
    log_info "Service status:"
    docker compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" ps
}

# Health check
health() {
    log_info "Checking service health..."

    # Check PostgreSQL
    if docker compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" exec -T postgres pg_isready -U "$POSTGRES_USER" &> /dev/null; then
        log_success "PostgreSQL: Healthy"
    else
        log_error "PostgreSQL: Unhealthy"
    fi

    # Check Next.js app
    if curl -sf http://localhost:3000/api/health &> /dev/null; then
        log_success "Next.js App: Healthy"
    else
        log_error "Next.js App: Unhealthy"
    fi

    # Check Nginx
    if docker compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" exec -T nginx nginx -t &> /dev/null; then
        log_success "Nginx: Healthy"
    else
        log_error "Nginx: Unhealthy"
    fi
}

# Backup database
backup() {
    local backup_dir="./backups"
    local timestamp=$(date +%Y%m%d_%H%M%S)
    local backup_file="${backup_dir}/paxala_media_${timestamp}.sql.gz"

    mkdir -p "$backup_dir"

    log_info "Creating database backup..."

    source "$ENV_FILE"

    docker compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" exec -T postgres \
        pg_dump -U "$POSTGRES_USER" -d "$POSTGRES_DB" | gzip > "$backup_file"

    log_success "Backup created: $backup_file"
}

# Restore database
restore() {
    local backup_file="$1"

    if [[ -z "$backup_file" ]]; then
        log_error "Please specify a backup file to restore."
        log_info "Usage: $0 restore <backup_file.sql.gz>"
        exit 1
    fi

    if [[ ! -f "$backup_file" ]]; then
        log_error "Backup file not found: $backup_file"
        exit 1
    fi

    log_warning "This will overwrite the current database. Are you sure? (y/N)"
    read -r confirm
    if [[ "$confirm" != "y" && "$confirm" != "Y" ]]; then
        log_info "Restore cancelled."
        exit 0
    fi

    source "$ENV_FILE"

    log_info "Restoring database from $backup_file..."

    gunzip -c "$backup_file" | docker compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" exec -T postgres \
        psql -U "$POSTGRES_USER" -d "$POSTGRES_DB"

    log_success "Database restored successfully."
}

# Clean up (remove containers, networks, volumes)
clean() {
    log_warning "This will remove all containers, networks, and volumes. Are you sure? (y/N)"
    read -r confirm
    if [[ "$confirm" != "y" && "$confirm" != "Y" ]]; then
        log_info "Clean cancelled."
        exit 0
    fi

    log_info "Cleaning up..."
    docker compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" down -v --remove-orphans
    docker image prune -f
    log_success "Cleanup completed."
}

# Update (pull latest and rebuild)
update() {
    log_info "Updating application..."

    # Pull latest code (if git repo)
    if [[ -d ".git" ]]; then
        log_info "Pulling latest code..."
        git pull
    fi

    # Rebuild and restart
    build
    migrate
    restart

    log_success "Update completed."
}

# Show usage
usage() {
    echo "Paxala Media Production - Deployment Script"
    echo ""
    echo "Usage: $0 <command> [options]"
    echo ""
    echo "Commands:"
    echo "  build       Build Docker images"
    echo "  start       Start all services"
    echo "  stop        Stop all services"
    echo "  restart     Restart all services"
    echo "  migrate     Run database migrations"
    echo "  logs [svc]  View logs (optionally for specific service)"
    echo "  status      Show service status"
    echo "  health      Check service health"
    echo "  backup      Backup database"
    echo "  restore     Restore database from backup"
    echo "  clean       Remove all containers and volumes"
    echo "  update      Pull latest code and redeploy"
    echo "  help        Show this help message"
    echo ""
    echo "Examples:"
    echo "  $0 start              # Start all services"
    echo "  $0 logs app           # View app logs"
    echo "  $0 restore backup.gz  # Restore from backup"
}

# Main
main() {
    cd "$(dirname "$0")/.."

    check_root

    case "${1:-}" in
        build)
            check_prerequisites
            check_env
            build
            ;;
        start)
            check_prerequisites
            check_env
            start
            ;;
        stop)
            check_prerequisites
            stop
            ;;
        restart)
            check_prerequisites
            check_env
            restart
            ;;
        migrate)
            check_prerequisites
            check_env
            migrate
            ;;
        logs)
            check_prerequisites
            logs "${2:-}"
            ;;
        status)
            check_prerequisites
            status
            ;;
        health)
            check_prerequisites
            check_env
            health
            ;;
        backup)
            check_prerequisites
            check_env
            backup
            ;;
        restore)
            check_prerequisites
            check_env
            restore "${2:-}"
            ;;
        clean)
            check_prerequisites
            clean
            ;;
        update)
            check_prerequisites
            check_env
            update
            ;;
        help|--help|-h)
            usage
            ;;
        *)
            usage
            exit 1
            ;;
    esac
}

main "$@"
