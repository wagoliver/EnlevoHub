#!/bin/sh
set -e

echo "EnlevoHub Backend - Starting..."

# Wait for PostgreSQL to be ready
echo "Waiting for PostgreSQL..."
until node -e "const net = require('net'); const s = net.connect({host: process.env.DB_HOST || 'postgres', port: process.env.DB_PORT || 5432}, () => { s.end(); process.exit(0); }); s.on('error', () => process.exit(1));" 2>/dev/null; do
  echo "  PostgreSQL not ready, retrying in 2s..."
  sleep 2
done
echo "PostgreSQL is ready."

# Run Prisma schema push (creates/updates tables)
# Working directory is already /app/packages/backend (set in Dockerfile)
echo "Applying database schema..."
npx prisma db push --skip-generate --accept-data-loss 2>/dev/null || npx prisma db push --skip-generate
echo "Database schema applied."

# Execute the main command
echo "Starting backend server..."
exec "$@"
