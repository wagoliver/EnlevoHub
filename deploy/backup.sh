#!/bin/bash
# ============================================================
# EnlevoHub - Daily Backup Script
# Add to crontab: 0 3 * * * /opt/enlevohub/backup.sh
# ============================================================

BACKUP_DIR="/opt/enlevohub/backups"
RETENTION_DAYS=30
DATE=$(date +%Y-%m-%d_%H%M)

mkdir -p $BACKUP_DIR

echo "[$(date)] Starting backup..."

# Backup PostgreSQL
docker exec enlevohub-postgres-1 pg_dump -U postgres enlevohub | gzip > "$BACKUP_DIR/db_$DATE.sql.gz"

# Backup storage config
cp -f /opt/enlevohub/.env "$BACKUP_DIR/env_$DATE.bak" 2>/dev/null

# Clean old backups
find $BACKUP_DIR -name "db_*.sql.gz" -mtime +$RETENTION_DAYS -delete
find $BACKUP_DIR -name "env_*.bak" -mtime +$RETENTION_DAYS -delete

echo "[$(date)] Backup complete: $BACKUP_DIR/db_$DATE.sql.gz"
