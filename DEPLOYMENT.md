# Deployment Guide

## Quick Redeploy

To redeploy with the latest changes on the server:

```bash
cd /path/to/paxala-media
./scripts/deploy.sh update
```

This will:
1. Pull latest code from git (if repository exists)
2. Rebuild Docker images
3. Run database migrations
4. Restart all services

## Manual Deployment Steps

If you need more control or the script isn't available:

### 1. Pull Latest Code (if using git)
```bash
cd /path/to/paxala-media
git pull origin main  # or your branch name
```

### 2. Rebuild Docker Images
```bash
docker compose -f docker-compose.yml --env-file .env.production build --no-cache
```

### 3. Run Database Migrations (if needed)
```bash
docker compose -f docker-compose.yml --env-file .env.production --profile migrate up migrate
```

### 4. Restart Services
```bash
docker compose -f docker-compose.yml --env-file .env.production up -d
```

Or restart just the app container:
```bash
docker compose -f docker-compose.yml --env-file .env.production restart app
```

## Available Deployment Commands

The deployment script (`scripts/deploy.sh`) provides several commands:

```bash
# Build Docker images
./scripts/deploy.sh build

# Start all services
./scripts/deploy.sh start

# Stop all services
./scripts/deploy.sh stop

# Restart all services
./scripts/deploy.sh restart

# Run database migrations
./scripts/deploy.sh migrate

# View logs (all services or specific service)
./scripts/deploy.sh logs
./scripts/deploy.sh logs app

# Check service status
./scripts/deploy.sh status

# Check service health
./scripts/deploy.sh health

# Backup database
./scripts/deploy.sh backup

# Update and redeploy (recommended)
./scripts/deploy.sh update
```

## Pre-Deployment Checklist

- [ ] Ensure `.env.production` file exists and is configured
- [ ] Ensure `NEXTAUTH_SECRET` is set (generate with: `openssl rand -base64 32`)
- [ ] Ensure `POSTGRES_PASSWORD` is set
- [ ] Verify database backups are available (optional but recommended)
- [ ] Check git status if using version control

## Post-Deployment Verification

### 1. Check Service Status
```bash
./scripts/deploy.sh status
# or
docker compose -f docker-compose.yml --env-file .env.production ps
```

### 2. Check Service Health
```bash
./scripts/deploy.sh health
```

### 3. Check Application Logs
```bash
./scripts/deploy.sh logs app
# or
docker compose -f docker-compose.yml --env-file .env.production logs -f app
```

### 4. Test API Endpoints
```bash
# Health check
curl http://localhost:3000/api/health

# Or if behind nginx
curl http://your-domain.com/api/health
```

## Troubleshooting

### If services fail to start:
```bash
# Check logs for errors
./scripts/deploy.sh logs

# Check specific service logs
docker compose -f docker-compose.yml --env-file .env.production logs app
docker compose -f docker-compose.yml --env-file .env.production logs postgres
```

### If database connection fails:
- Verify `DATABASE_URL` in `.env.production` is correct
- Check PostgreSQL container is running: `docker ps | grep postgres`
- Check PostgreSQL logs: `./scripts/deploy.sh logs postgres`

### If app crashes:
- Check Next.js build was successful (look for errors in build logs)
- Verify all environment variables are set correctly
- Check if database migrations completed successfully

### Rollback (if needed):
```bash
# Stop services
./scripts/deploy.sh stop

# Restore from git
git checkout HEAD~1  # or specific commit

# Rebuild and restart
./scripts/deploy.sh build
./scripts/deploy.sh start
```

## Zero-Downtime Deployment (Advanced)

For zero-downtime deployments, you can:

1. Build new image with a tag:
```bash
docker compose -f docker-compose.yml --env-file .env.production build --no-cache app
```

2. Create new container alongside old one, then switch when ready

However, for this application, a quick restart usually has minimal downtime (< 5 seconds).

## Environment File

Make sure `.env.production` contains:
- `NEXTAUTH_SECRET` - Secret for NextAuth (generate with `openssl rand -base64 32`)
- `NEXTAUTH_URL` - Your production URL (e.g., `https://yourdomain.com`)
- `NEXT_PUBLIC_SITE_URL` - Your public site URL
- `POSTGRES_USER` - Database username
- `POSTGRES_PASSWORD` - Database password
- `POSTGRES_DB` - Database name

## Notes

- The deployment script requires Docker and Docker Compose
- Make sure the script is executable: `chmod +x scripts/deploy.sh`
- The script expects `.env.production` file in the project root
- Database data persists in Docker volumes, so data won't be lost on redeploy


