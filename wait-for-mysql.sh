#!/bin/sh
set -e

# Parse host and port from DATABASE_URL
# Format: mysql://user:pass@host:port/database
DB_HOST=$(echo "$DATABASE_URL" | sed -n 's|.*://[^@]*@\([^:]*\):.*|\1|p')
DB_PORT=$(echo "$DATABASE_URL" | sed -n 's|.*://[^@]*@[^:]*:\([0-9]*\)/.*|\1|p')

if [ -z "$DB_HOST" ] || [ -z "$DB_PORT" ]; then
  echo "ERROR: Could not parse DATABASE_URL: $DATABASE_URL"
  exit 1
fi

echo "Waiting for MySQL at $DB_HOST:$DB_PORT..."
MAX_WAIT=60
WAITED=0

while ! nc -z "$DB_HOST" "$DB_PORT"; do
  if [ "$WAITED" -ge "$MAX_WAIT" ]; then
    echo "ERROR: MySQL not ready after ${MAX_WAIT}s"
    exit 1
  fi
  sleep 2
  WAITED=$((WAITED + 2))
  echo "Still waiting... (${WAITED}s/${MAX_WAIT}s)"
done

echo "MySQL is ready! Running migrations..."
npx prisma migrate deploy
echo "Running seed..."
node prisma/seed.js
echo "Starting app..."
node src/index.js
