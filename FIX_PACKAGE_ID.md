# Fix: Add packageId Column to Booking Table

## Problem
The database schema is missing the `packageId` column in the `Booking` table, causing the dashboard API to fail with:
```
The column `Booking.packageId` does not exist in the current database.
```

## Solution
A migration has been created to add the missing column. Apply it using one of the methods below.

## Method 1: Apply Migration via Docker (Recommended)

On your server, run:

```bash
cd /var/www/paxala-media
docker compose -f docker-compose.yml --env-file .env.production --profile migrate up migrate
```

This will run the migration container which applies all pending migrations.

## Method 2: Apply Migration Directly via psql

```bash
# Connect to the PostgreSQL container
docker compose -f docker-compose.yml --env-file .env.production exec postgres psql -U paxala -d paxala_media

# Then run:
ALTER TABLE "Booking" ADD COLUMN "packageId" TEXT;

# Exit psql
\q
```

## Method 3: Manual SQL Execution

```bash
# Get the database connection details from .env.production
# Then connect and run:
docker compose -f docker-compose.yml --env-file .env.production exec postgres psql -U paxala -d paxala_media -c 'ALTER TABLE "Booking" ADD COLUMN "packageId" TEXT;'
```

## Verify Migration Applied

After applying the migration, verify it worked:

```bash
# Check if column exists
docker compose -f docker-compose.yml --env-file .env.production exec postgres psql -U paxala -d paxala_media -c '\d "Booking"'
```

You should see `packageId` in the column list.

## Restart Application

After the migration, restart the app:

```bash
docker compose -f docker-compose.yml --env-file .env.production restart app
```

## Test

Check if the dashboard API works:

```bash
# View logs
docker compose -f docker-compose.yml --env-file .env.production logs -f app
```

The error should be resolved and the dashboard API should work correctly.

