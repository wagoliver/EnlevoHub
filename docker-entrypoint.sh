#!/bin/sh
set -e

echo "EnlevoHub Backend - Starting..."

# Wait for PostgreSQL to be ready
echo "Waiting for PostgreSQL..."
until wget --no-verbose --tries=1 --spider http://localhost:5432 2>/dev/null || \
      node -e "const net = require('net'); const s = net.connect({host: process.env.DB_HOST || 'postgres', port: process.env.DB_PORT || 5432}, () => { s.end(); process.exit(0); }); s.on('error', () => process.exit(1));" 2>/dev/null; do
  echo "  PostgreSQL not ready, retrying in 2s..."
  sleep 2
done
echo "PostgreSQL is ready."

# Run Prisma schema push (creates/updates tables)
echo "Applying database schema..."
cd /app/packages/backend
npx prisma db push --skip-generate --accept-data-loss 2>/dev/null || npx prisma db push --skip-generate
cd /app

echo "Database schema applied."

# Execute the main command
echo "Starting backend server..."
exec "$@"
