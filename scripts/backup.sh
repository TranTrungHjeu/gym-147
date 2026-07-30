#!/bin/bash
# ================================
# Backup Script
# GYM-147 Database & Files
# ================================

set -e

# Configuration
BACKUP_DIR="${BACKUP_DIR:-/opt/backups/gym-147}"
DATE=$(date +%Y%m%d_%H%M%S)
PROJECT_NAME="gym-147"

# Create backup directory
mkdir -p "$BACKUP_DIR"

echo "======================================"
echo "  GYM-147 Backup Script"
echo "======================================"

# Stop services for consistent backup
echo "Stopping services..."
cd /opt/gym-147
docker compose -f docker-compose.prod.yml stop

# Backup PostgreSQL
echo "Backing up PostgreSQL..."
docker compose -f docker-compose.prod.yml exec -T postgres pg_dump -U gym > "$BACKUP_DIR/postgres_${DATE}.sql"

# Backup Redis
echo "Backing up Redis..."
docker compose -f docker-compose.prod.yml exec -T redis redis-cli -a "${REDIS_PASSWORD:-redis_secret}" BGSAVE
sleep 5
docker compose -f docker-compose.prod.yml cp redis:/data/dump.rdb "$BACKUP_DIR/redis_${DATE}.rdb"

# Backup uploads
echo "Backing up uploads..."
tar -czf "$BACKUP_DIR/uploads_${DATE}.tar.gz" /opt/gym-147/data/uploads 2>/dev/null || true

# Compress PostgreSQL backup
gzip "$BACKUP_DIR/postgres_${DATE}.sql"

# Start services
echo "Starting services..."
docker compose -f docker-compose.prod.yml start

# Cleanup old backups (keep last 7 days)
echo "Cleaning up old backups..."
find "$BACKUP_DIR" -type f -mtime +7 -delete

echo "======================================"
echo "✅ Backup completed!"
echo "📁 Location: $BACKUP_DIR"
echo "======================================"
