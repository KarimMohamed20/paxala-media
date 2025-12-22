# How to Check Server Logs

To diagnose the dashboard API error, run these commands on your server:

## Check Docker Container Logs

```bash
# View app container logs (last 100 lines)
docker compose -f docker-compose.yml --env-file .env.production logs --tail=100 app

# View app container logs in real-time
docker compose -f docker-compose.yml --env-file .env.production logs -f app

# View all service logs
docker compose -f docker-compose.yml --env-file .env.production logs --tail=100

# Search for errors in logs
docker compose -f docker-compose.yml --env-file .env.production logs app | grep -i error

# View logs with timestamps
docker compose -f docker-compose.yml --env-file .env.production logs -t app
```

## Check Container Status

```bash
# Check if containers are running
docker compose -f docker-compose.yml --env-file .env.production ps

# Check container health
docker compose -f docker-compose.yml --env-file .env.production ps --format "table {{.Name}}\t{{.Status}}\t{{.Ports}}"
```

## Test API Endpoint Directly

```bash
# Test health endpoint
curl http://localhost:3000/api/health

# Test dashboard endpoint (will need authentication)
curl http://localhost:3000/api/dashboard
```

## Common Issues to Look For

1. **Database Connection Errors**: Look for "ECONNREFUSED" or "database" errors
2. **Prisma Errors**: Look for "Prisma" or "query" related errors
3. **Authentication Errors**: Look for "session" or "unauthorized" errors
4. **Type Errors**: Look for TypeScript/JavaScript type errors

## If Using Deployment Script

```bash
# View logs using deployment script
./scripts/deploy.sh logs app

# Or view all logs
./scripts/deploy.sh logs
```

