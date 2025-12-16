#!/bin/bash

# ============================================
# SSL Certificate Setup with Let's Encrypt
# ============================================

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Configuration - command is $1, domain is $2, email is $3
COMMAND="${1:-}"
DOMAIN="${2:-paxalamedia.com}"
EMAIL="${3:-admin@paxalamedia.com}"
SSL_DIR="./docker/nginx/ssl"
CERTBOT_DIR="./docker/certbot"

log_info() { echo -e "${BLUE}[INFO]${NC} $1"; }
log_success() { echo -e "${GREEN}[SUCCESS]${NC} $1"; }
log_warning() { echo -e "${YELLOW}[WARNING]${NC} $1"; }
log_error() { echo -e "${RED}[ERROR]${NC} $1"; }

# Generate self-signed certificate for development/testing
generate_self_signed() {
    log_info "Generating self-signed SSL certificate for development..."

    mkdir -p "$SSL_DIR"

    openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
        -keyout "$SSL_DIR/privkey.pem" \
        -out "$SSL_DIR/fullchain.pem" \
        -subj "/C=IL/ST=Israel/L=Sakhnin/O=Paxala Media/CN=$DOMAIN"

    log_success "Self-signed certificate generated at $SSL_DIR"
    log_warning "This certificate is for development only. Use Let's Encrypt for production."
}

# Setup Let's Encrypt with Certbot
setup_letsencrypt() {
    log_info "Setting up Let's Encrypt certificate for $DOMAIN..."

    # Check if certbot is available
    if ! command -v certbot &> /dev/null; then
        log_info "Installing Certbot..."

        # Detect OS and install certbot
        if command -v apt-get &> /dev/null; then
            sudo apt-get update
            sudo apt-get install -y certbot
        elif command -v yum &> /dev/null; then
            sudo yum install -y certbot
        elif command -v dnf &> /dev/null; then
            sudo dnf install -y certbot
        else
            log_error "Could not detect package manager. Please install certbot manually."
            exit 1
        fi
    fi

    mkdir -p "$SSL_DIR"
    mkdir -p "$CERTBOT_DIR/www"

    # Stop nginx if running to free port 80
    log_info "Temporarily stopping Nginx..."
    docker compose stop nginx 2>/dev/null || true

    # Obtain certificate
    log_info "Obtaining Let's Encrypt certificate..."
    sudo certbot certonly \
        --standalone \
        --preferred-challenges http \
        --email "$EMAIL" \
        --agree-tos \
        --no-eff-email \
        -d "$DOMAIN" \
        -d "www.$DOMAIN"

    # Copy certificates to Docker volume
    log_info "Copying certificates..."
    sudo cp "/etc/letsencrypt/live/$DOMAIN/fullchain.pem" "$SSL_DIR/"
    sudo cp "/etc/letsencrypt/live/$DOMAIN/privkey.pem" "$SSL_DIR/"
    sudo chown -R $(whoami):$(whoami) "$SSL_DIR"

    # Restart nginx
    log_info "Restarting Nginx..."
    docker compose start nginx

    log_success "Let's Encrypt certificate installed successfully!"
    log_info "Certificate will expire in 90 days. Set up auto-renewal with: sudo certbot renew --dry-run"
}

# Setup auto-renewal cron job
setup_renewal() {
    log_info "Setting up automatic certificate renewal..."

    # Create renewal script
    cat > "$CERTBOT_DIR/renew.sh" << 'RENEWAL_SCRIPT'
#!/bin/bash
certbot renew --quiet --post-hook "docker compose -f /path/to/docker-compose.yml exec nginx nginx -s reload"
RENEWAL_SCRIPT

    chmod +x "$CERTBOT_DIR/renew.sh"

    # Add to crontab (runs twice daily as recommended by Let's Encrypt)
    (crontab -l 2>/dev/null | grep -v "certbot renew"; echo "0 0,12 * * * $(pwd)/$CERTBOT_DIR/renew.sh >> /var/log/certbot-renew.log 2>&1") | crontab -

    log_success "Auto-renewal cron job set up successfully."
    log_info "Certificates will be renewed automatically when they expire."
}

# Show usage
usage() {
    echo "SSL Certificate Setup Script"
    echo ""
    echo "Usage: $0 <command> [domain] [email]"
    echo ""
    echo "Commands:"
    echo "  self-signed      Generate self-signed certificate (for development)"
    echo "  letsencrypt      Obtain Let's Encrypt certificate (for production)"
    echo "  renew-setup      Setup automatic renewal cron job"
    echo ""
    echo "Examples:"
    echo "  $0 self-signed paxalamedia.com"
    echo "  $0 letsencrypt paxalamedia.com admin@paxalamedia.com"
    echo "  $0 renew-setup"
}

# Main
main() {
    cd "$(dirname "$0")/.."

    case "$COMMAND" in
        self-signed)
            generate_self_signed
            ;;
        letsencrypt)
            if [[ -z "$DOMAIN" || "$DOMAIN" == "paxalamedia.com" ]]; then
                log_error "Please specify a domain."
                usage
                exit 1
            fi
            setup_letsencrypt
            ;;
        renew-setup)
            setup_renewal
            ;;
        *)
            usage
            exit 1
            ;;
    esac
}

main "$@"
