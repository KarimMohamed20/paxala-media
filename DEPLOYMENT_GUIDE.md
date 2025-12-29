# Paxala Media Production - Complete Deployment Guide

Comprehensive guide for deploying and managing the Paxala Media Production application on a production server.

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Initial Server Setup](#initial-server-setup)
3. [Application Deployment](#application-deployment)
4. [SSL/TLS Configuration](#ssltls-configuration)
5. [Environment Variables](#environment-variables)
6. [File Uploads Configuration](#file-uploads-configuration)
7. [Deployment Operations](#deployment-operations)
8. [Monitoring & Maintenance](#monitoring--maintenance)
9. [Troubleshooting](#troubleshooting)
10. [Performance Optimization](#performance-optimization)

---

## Prerequisites

### Server Requirements
- **OS**: Ubuntu 20.04 LTS or later (or Debian 11+)
- **CPU**: 2 cores minimum, 4 cores recommended
- **RAM**: 4GB minimum, 8GB+ recommended
- **Storage**: 50GB+ SSD storage
- **Network**: Public IP with open ports 80, 443

### Required Software
- Docker Engine (latest)
- Docker Compose V2
- Git
- Certbot (for Let's Encrypt SSL)
- Basic Linux utilities (curl, wget, nano)

---

## Initial Server Setup

### 1. Update System Packages

```bash
sudo apt update && sudo apt upgrade -y
sudo apt install curl wget git nano htop -y
```

### 2. Install Docker

```bash
# Download and run Docker installation script
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh

# Add your user to docker group (logout and login after this)
sudo usermod -aG docker $USER

# Start Docker service
sudo systemctl enable docker
sudo systemctl start docker

# Verify installation
docker --version
docker compose version
```

### 3. Install Certbot for SSL

```bash
sudo apt install certbot -y
```

### 4. Configure Firewall

```bash
# Install UFW if not already installed
sudo apt install ufw -y

# Configure firewall rules
sudo ufw allow 22/tcp     # SSH
sudo ufw allow 80/tcp     # HTTP
sudo ufw allow 443/tcp    # HTTPS

# Enable firewall
sudo ufw enable

# Check status
sudo ufw status
```

### 5. Configure DNS

Before proceeding, ensure your domain points to your server:

```bash
# Verify DNS is configured
dig paxaland.com +short
dig www.paxaland.com +short
```

Both should return your server's IP address.

---

## Application Deployment

### 1. Clone Repository

```bash
# Create application directory
sudo mkdir -p /var/www
cd /var/www

# Clone repository
sudo git clone https://github.com/yourusername/paxala-media.git paxala-media
cd paxala-media

# Set proper ownership
sudo chown -R $USER:$USER /var/www/paxala-media
```

### 2. Create Required Directories

```bash
cd /var/www/paxala-media

# Create uploads directory structure
mkdir -p public/uploads/portfolio
mkdir -p public/uploads/projects

# Create nginx directories
mkdir -p docker/nginx/logs
mkdir -p docker/nginx/ssl

# Create postgres init directory
mkdir -p docker/postgres/init

# Create backups directory
mkdir -p backups

# Set proper permissions
chmod -R 755 public/uploads
chmod -R 755 backups
```

### 3. Configure Environment Variables

```bash
# Copy production environment template
cp .env.production.example .env.production

# Edit with your actual values
nano .env.production
```

**Required Configuration:**

```bash
# ============================================
# Database Configuration
# ============================================
POSTGRES_USER=paxala
POSTGRES_PASSWORD=YOUR_SUPER_SECURE_PASSWORD_HERE  # Change this!
POSTGRES_DB=paxala_media

# ============================================
# NextAuth Configuration
# ============================================
NEXTAUTH_URL=https://paxaland.com
NEXTAUTH_SECRET=YOUR_SECURE_SECRET_HERE  # Generate with: openssl rand -base64 32

# ============================================
# Site Configuration (CRITICAL for file uploads)
# ============================================
NEXT_PUBLIC_SITE_URL=https://paxaland.com

# ============================================
# Database Connection String
# ============================================
DATABASE_URL="postgresql://paxala:YOUR_SUPER_SECURE_PASSWORD_HERE@postgres:5432/paxala_media?schema=public"
```

**Generate secure secrets:**

```bash
# Generate NEXTAUTH_SECRET
openssl rand -base64 32

# Generate POSTGRES_PASSWORD
openssl rand -base64 24
```

---

## SSL/TLS Configuration

### Option A: Let's Encrypt (Recommended)

```bash
# Stop any services using ports 80/443
docker compose down 2>/dev/null || true

# Obtain SSL certificate
sudo certbot certonly --standalone \
  -d paxaland.com \
  -d www.paxaland.com \
  --email info@paxaland.com \
  --agree-tos \
  --non-interactive

# Copy certificates to nginx directory
sudo cp /etc/letsencrypt/live/paxaland.com/fullchain.pem \
  /var/www/paxala-media/docker/nginx/ssl/

sudo cp /etc/letsencrypt/live/paxaland.com/privkey.pem \
  /var/www/paxala-media/docker/nginx/ssl/

# Set proper ownership
sudo chown -R 1000:1000 /var/www/paxala-media/docker/nginx/ssl
sudo chmod 644 /var/www/paxala-media/docker/nginx/ssl/fullchain.pem
sudo chmod 600 /var/www/paxala-media/docker/nginx/ssl/privkey.pem
```

### Option B: Existing Certificate

```bash
# Copy your existing certificates
sudo cp /path/to/your/fullchain.pem /var/www/paxala-media/docker/nginx/ssl/
sudo cp /path/to/your/privkey.pem /var/www/paxala-media/docker/nginx/ssl/

# Set permissions
sudo chown -R 1000:1000 /var/www/paxala-media/docker/nginx/ssl
sudo chmod 644 /var/www/paxala-media/docker/nginx/ssl/fullchain.pem
sudo chmod 600 /var/www/paxala-media/docker/nginx/ssl/privkey.pem
```

### Set Up SSL Auto-Renewal

```bash
# Create renewal script
sudo tee /etc/cron.monthly/renew-paxala-ssl.sh > /dev/null <<'EOF'
#!/bin/bash
set -e

# Renew certificate
certbot renew --quiet

# Copy renewed certificates
cp /etc/letsencrypt/live/paxaland.com/fullchain.pem /var/www/paxala-media/docker/nginx/ssl/
cp /etc/letsencrypt/live/paxaland.com/privkey.pem /var/www/paxala-media/docker/nginx/ssl/

# Restart nginx to use new certificates
cd /var/www/paxala-media
docker compose restart nginx

echo "SSL certificates renewed and nginx restarted"
EOF

# Make executable
sudo chmod +x /etc/cron.monthly/renew-paxala-ssl.sh
```

---

## File Uploads Configuration

### Understanding the Upload Path

The application stores uploaded files in `/var/www/paxala-media/public/uploads/` and nginx serves them directly for better performance.

**Path Mapping:**
```
URL: https://paxaland.com/uploads/portfolio/image.png
↓
Nginx serves from: /var/www/paxala-media/public/uploads/portfolio/image.png
```

### Nginx Configuration

The nginx configuration is already set up in `docker/nginx/conf.d/default.conf`:

```nginx
# Static file uploads (served directly by nginx for better performance)
location /uploads/ {
    alias /var/www/paxala-media/public/uploads/;
    expires 30d;
    add_header Cache-Control "public, immutable";
    add_header Access-Control-Allow-Origin "*";
    try_files $uri =404;
}
```

### Verify Upload Configuration

```bash
# Ensure directory exists with correct permissions
ls -la /var/www/paxala-media/public/uploads/

# Should show:
# drwxr-xr-x public/uploads
# drwxr-xr-x public/uploads/portfolio
```

### File Upload Limits

Default upload limit is 50MB. To change:

Edit `docker/nginx/conf.d/default.conf`:
```nginx
# Client max body size (for file uploads)
client_max_body_size 100M;  # Change to desired size
```

Then restart nginx:
```bash
docker compose restart nginx
```

---

## Deployment Operations

### Initial Deployment

```bash
cd /var/www/paxala-media

# Verify environment is configured
cat .env.production | grep NEXT_PUBLIC_SITE_URL

# Run deployment
./scripts/deploy.sh build      # Build Docker images
./scripts/deploy.sh migrate    # Run database migrations
./scripts/deploy.sh start      # Start all services

# Verify services are running
./scripts/deploy.sh status
./scripts/deploy.sh health
```

**Expected output:**
```
✅ PostgreSQL: Healthy
✅ Next.js App: Healthy
✅ Nginx: Healthy
```

### Verify Deployment

```bash
# Check all containers are running
docker compose ps

# Check application logs
docker compose logs app --tail=50

# Test the website
curl -I https://paxaland.com

# Test file upload endpoint
curl https://paxaland.com/api/health
```

### Updating the Application

```bash
cd /var/www/paxala-media

# Method 1: Use update command (pulls code, rebuilds, restarts)
./scripts/deploy.sh update

# Method 2: Manual update
git pull origin main
./scripts/deploy.sh build
./scripts/deploy.sh migrate
./scripts/deploy.sh restart
```

### Common Operations

```bash
# View logs
./scripts/deploy.sh logs              # All services
./scripts/deploy.sh logs app          # App only
./scripts/deploy.sh logs nginx        # Nginx only
./scripts/deploy.sh logs postgres     # Database only

# Follow logs in real-time
./scripts/deploy.sh logs app -f

# Restart services
./scripts/deploy.sh restart

# Stop all services
./scripts/deploy.sh stop

# Start services
./scripts/deploy.sh start

# Check service status
./scripts/deploy.sh status

# Health check
./scripts/deploy.sh health

# Database backup
./scripts/deploy.sh backup

# Database restore
./scripts/deploy.sh restore backups/paxala_media_20231215_143022.sql.gz
```

---

## Monitoring & Maintenance

### 1. Log Management

**View Logs:**

```bash
# Real-time application logs
docker compose logs -f app

# Nginx access logs
tail -f /var/www/paxala-media/docker/nginx/logs/access.log

# Nginx error logs
tail -f /var/www/paxala-media/docker/nginx/logs/error.log

# Database logs
docker compose logs -f postgres

# Last 100 lines from app
docker compose logs --tail=100 app
```

**Log Rotation:**

```bash
# Create log rotation config
sudo tee /etc/logrotate.d/paxala-media > /dev/null <<'EOF'
/var/www/paxala-media/docker/nginx/logs/*.log {
    daily
    rotate 30
    compress
    delaycompress
    notifempty
    missingok
    sharedscripts
    postrotate
        docker compose -f /var/www/paxala-media/docker-compose.yml restart nginx > /dev/null 2>&1 || true
    endscript
}
EOF
```

### 2. Database Backups

**Automated Daily Backups:**

```bash
# Create backup script
sudo tee /etc/cron.daily/backup-paxala-db.sh > /dev/null <<'EOF'
#!/bin/bash
set -e

cd /var/www/paxala-media

# Run backup
./scripts/deploy.sh backup

# Keep only last 30 days
find ./backups -name "paxala_media_*.sql.gz" -mtime +30 -delete

# Log success
echo "$(date): Database backup completed" >> ./backups/backup.log
EOF

# Make executable
sudo chmod +x /etc/cron.daily/backup-paxala-db.sh
```

**Manual Backup:**

```bash
cd /var/www/paxala-media
./scripts/deploy.sh backup
```

**Restore from Backup:**

```bash
# List available backups
ls -lh backups/

# Restore specific backup
./scripts/deploy.sh restore backups/paxala_media_20231215_143022.sql.gz
```

### 3. Monitor System Resources

```bash
# Check disk space
df -h

# Check Docker disk usage
docker system df

# Check uploads directory size
du -sh /var/www/paxala-media/public/uploads

# Monitor container resources
docker stats

# Check memory usage
free -h

# Check system load
uptime
```

### 4. Regular Maintenance Tasks

**Weekly:**
- Check logs for errors
- Monitor disk space
- Verify backups are running

**Monthly:**
- Update system packages: `sudo apt update && sudo apt upgrade -y`
- Clean Docker cache: `docker system prune -f`
- Verify SSL certificate expiration: `openssl x509 -in /var/www/paxala-media/docker/nginx/ssl/fullchain.pem -noout -dates`
- Run database maintenance: `docker compose exec postgres psql -U paxala -d paxala_media -c "VACUUM ANALYZE;"`

**Quarterly:**
- Review and archive old backups
- Security audit
- Performance review

---

## Troubleshooting

### Docker Build Hangs

**Symptoms:** Build gets stuck at `RUN npm run build`

**Solution:**

```bash
# 1. Run diagnostics
./scripts/diagnose-server.sh

# 2. Check available memory (need 4GB+)
free -h

# 3. Clean Docker cache
docker system prune -a --volumes -f

# 4. Try building again
./scripts/deploy.sh build
```

### Docker Network Errors

**Symptoms:** `Error: network not found` or `failed to set up container networking`

**Solution:**

```bash
# Run network fix script
./scripts/fix-network.sh

# Or manually:
docker compose down
docker network prune -f
docker network rm pmp_network 2>/dev/null || true
docker network create pmp_network
./scripts/deploy.sh start
```

### File Uploads Not Accessible

**Symptoms:** Files upload successfully but return 404 when accessed

**Diagnosis:**

```bash
# 1. Check if files exist
ls -la /var/www/paxala-media/public/uploads/portfolio/

# 2. Check nginx logs
docker compose logs nginx | grep uploads

# 3. Test direct file access
curl -I https://paxaland.com/uploads/portfolio/test.png
```

**Solution:**

```bash
# Fix permissions
chmod -R 755 /var/www/paxala-media/public/uploads
chown -R 1000:1000 /var/www/paxala-media/public/uploads

# Restart nginx
docker compose restart nginx

# Verify nginx configuration
docker compose exec nginx nginx -t
```

### Database Connection Errors

**Symptoms:** Application can't connect to database

**Diagnosis:**

```bash
# Check PostgreSQL is running
docker compose ps postgres

# Check database logs
docker compose logs postgres

# Verify environment variables
grep DATABASE_URL /var/www/paxala-media/.env.production
```

**Solution:**

```bash
# Restart database
docker compose restart postgres

# Wait for health check
./scripts/deploy.sh health

# Test connection manually
docker compose exec postgres psql -U paxala -d paxala_media -c "SELECT 1;"
```

### SSL Certificate Issues

**Symptoms:** SSL errors or certificate warnings

**Diagnosis:**

```bash
# Check certificate validity
openssl x509 -in /var/www/paxala-media/docker/nginx/ssl/fullchain.pem -noout -dates

# Check certificate matches domain
openssl x509 -in /var/www/paxala-media/docker/nginx/ssl/fullchain.pem -noout -subject
```

**Solution:**

```bash
# Renew certificate
sudo certbot renew --force-renewal

# Copy renewed certificate
sudo cp /etc/letsencrypt/live/paxaland.com/fullchain.pem /var/www/paxala-media/docker/nginx/ssl/
sudo cp /etc/letsencrypt/live/paxaland.com/privkey.pem /var/www/paxala-media/docker/nginx/ssl/

# Restart nginx
docker compose restart nginx
```

### Out of Disk Space

**Diagnosis:**

```bash
# Check disk usage
df -h

# Check what's using space
du -sh /var/www/paxala-media/*
du -sh /var/www/paxala-media/public/uploads/*
du -sh /var/www/paxala-media/backups/*
```

**Solution:**

```bash
# Clean Docker cache
docker system prune -a --volumes -f

# Clean old backups (keep last 30 days)
find /var/www/paxala-media/backups -name "*.sql.gz" -mtime +30 -delete

# Clean old logs
truncate -s 0 /var/www/paxala-media/docker/nginx/logs/*.log

# Clean old uploads (if applicable)
# BE CAREFUL - only delete files you know are not needed
```

### Container Won't Start

**Diagnosis:**

```bash
# Check container status
docker compose ps

# Check logs for specific container
docker compose logs [container-name]

# Check if ports are already in use
sudo netstat -tulpn | grep :80
sudo netstat -tulpn | grep :443
sudo netstat -tulpn | grep :5432
```

**Solution:**

```bash
# Kill process using the port
sudo kill -9 $(sudo lsof -t -i:80)
sudo kill -9 $(sudo lsof -t -i:443)

# Or restart everything
docker compose down
docker compose up -d
```

---

## Performance Optimization

### 1. Enable HTTP/2

Already enabled in `docker/nginx/conf.d/default.conf`:
```nginx
listen 443 ssl http2;
```

### 2. Enable Gzip Compression

Already configured in `docker/nginx/nginx.conf` for:
- JavaScript, CSS, HTML
- JSON, XML
- Fonts (EOT, OTF, TTF)
- SVG images

### 3. Static File Caching

Nginx is configured to cache:
- Uploads: 30 days
- Next.js static files: 365 days
- Images: 30 days

### 4. CDN Integration (Optional)

For global performance, integrate with Cloudflare:

1. Point DNS to Cloudflare
2. Enable proxy (orange cloud)
3. Configure cache rules:
   ```
   /uploads/*     → Cache everything, edge TTL: 30 days
   /_next/static/* → Cache everything, edge TTL: 365 days
   /images/*      → Cache everything, edge TTL: 30 days
   ```

### 5. Database Optimization

```bash
# Run monthly database maintenance
docker compose exec postgres psql -U paxala -d paxala_media -c "VACUUM ANALYZE;"

# Check database size
docker compose exec postgres psql -U paxala -d paxala_media -c "
  SELECT pg_size_pretty(pg_database_size('paxala_media'));"
```

### 6. Monitor Performance

```bash
# Check response times
curl -w "@-" -o /dev/null -s https://paxaland.com <<'EOF'
    time_namelookup:  %{time_namelookup}\n
       time_connect:  %{time_connect}\n
    time_appconnect:  %{time_appconnect}\n
      time_redirect:  %{time_redirect}\n
   time_starttransfer:  %{time_starttransfer}\n
                     ----------\n
         time_total:  %{time_total}\n
EOF
```

---

## Security Best Practices

### 1. Environment Variables

- ✅ Never commit `.env.production` to git
- ✅ Use strong passwords (32+ characters)
- ✅ Rotate secrets quarterly
- ✅ Limit file permissions: `chmod 600 .env.production`

### 2. Docker Security

- ✅ Run containers as non-root (already configured)
- ✅ Keep Docker and images updated
- ✅ Scan for vulnerabilities: `docker scan paxala-media-app`

### 3. Nginx Security

Already configured:
- ✅ Security headers (X-Frame-Options, X-Content-Type-Options, etc.)
- ✅ Rate limiting (API: 30 req/s, General: 10 req/s)
- ✅ Connection limits
- ✅ Server tokens hidden

### 4. Database Security

- ✅ Use strong passwords
- ✅ Database not exposed externally (only accessible from Docker network)
- ✅ Regular backups
- ✅ Encrypted backups (recommended)

### 5. SSL/TLS

- ✅ Use TLS 1.2 and 1.3 only
- ✅ Strong cipher suites
- ✅ Auto-renewal configured
- ✅ Redirect HTTP to HTTPS

### 6. Firewall

```bash
# Verify firewall is active
sudo ufw status

# Should show:
# To                         Action      From
# --                         ------      ----
# 22/tcp                     ALLOW       Anywhere
# 80/tcp                     ALLOW       Anywhere
# 443/tcp                    ALLOW       Anywhere
```

---

## Quick Reference

### Important Paths

| Path | Description |
|------|-------------|
| `/var/www/paxala-media/` | Application root |
| `/var/www/paxala-media/public/uploads/` | Uploaded files |
| `/var/www/paxala-media/docker/nginx/ssl/` | SSL certificates |
| `/var/www/paxala-media/docker/nginx/logs/` | Nginx logs |
| `/var/www/paxala-media/backups/` | Database backups |
| `/var/www/paxala-media/.env.production` | Environment variables |

### Important URLs

| URL | Description |
|-----|-------------|
| `https://paxaland.com` | Main website |
| `https://paxaland.com/dashboard` | Admin dashboard |
| `https://paxaland.com/api/health` | Health check endpoint |
| `https://paxaland.com/uploads/` | Static uploads directory |

### Service Ports

| Port | Service | Access |
|------|---------|--------|
| 80 | HTTP | Public (redirects to 443) |
| 443 | HTTPS (Nginx) | Public |
| 3000 | Next.js App | Internal only |
| 5432 | PostgreSQL | Internal only |

### Deployment Commands

| Command | Description |
|---------|-------------|
| `./scripts/deploy.sh build` | Build Docker images |
| `./scripts/deploy.sh start` | Start all services |
| `./scripts/deploy.sh stop` | Stop all services |
| `./scripts/deploy.sh restart` | Restart all services |
| `./scripts/deploy.sh migrate` | Run database migrations |
| `./scripts/deploy.sh update` | Pull code and redeploy |
| `./scripts/deploy.sh logs [service]` | View logs |
| `./scripts/deploy.sh status` | Check service status |
| `./scripts/deploy.sh health` | Run health checks |
| `./scripts/deploy.sh backup` | Backup database |
| `./scripts/deploy.sh restore <file>` | Restore database |

### Troubleshooting Commands

| Issue | Command |
|-------|---------|
| Build hangs | `./scripts/diagnose-server.sh` |
| Network error | `./scripts/fix-network.sh` |
| Check logs | `docker compose logs -f app` |
| Restart service | `docker compose restart <service>` |
| Clean Docker | `docker system prune -a -f` |
| Check disk space | `df -h` |
| Check container stats | `docker stats` |

---

## Support & Contact

### Technical Support
- **Email**: info@paxaland.com
- **Phone**: +972 52-330-0119
- **GitHub**: Create an issue in the repository

### Emergency Contacts
For critical production issues:
1. Check troubleshooting section
2. Review logs: `./scripts/deploy.sh logs`
3. Contact technical support

---

## Changelog

### Version 1.0.0 - December 2025
- Initial deployment guide
- File upload configuration with full URLs
- Docker network fixes
- SSL/TLS setup
- Comprehensive troubleshooting

---

**Document Version**: 1.0.0
**Last Updated**: December 30, 2025
**Maintained By**: Paxala Media Development Team
