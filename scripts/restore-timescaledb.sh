#!/bin/bash

# TimescaleDB Restore Script for EC2
# Restores database from compressed backup
# Usage: ./scripts/restore-timescaledb.sh <backup_file> [from-s3]
#   backup_file: filename (e.g., best_lap_backup_20250227_120000.sql.gz)
#   from-s3: optional flag to download from S3 first

set -e

if [ -z "$1" ]; then
    echo "Usage: $0 <backup_file> [from-s3]"
    echo "Example: $0 best_lap_backup_20250227_120000.sql.gz"
    echo "Example: $0 best_lap_backup_20250227_120000.sql.gz from-s3"
    exit 1
fi

# Configuration
BACKUP_FILE="$1"
FROM_S3="${2:-}"
BACKUP_DIR="/home/ubuntu/backups/timescaledb"
S3_BUCKET="${S3_BACKUP_BUCKET:-}"

# Database credentials
DB_CONTAINER="timescaledb"
DB_NAME="best_lap_db"
DB_USER="best_lap"
DB_PASSWORD="${DB_PASSWORD:-best_lap_password}"

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

log_info() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

log_warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Download from S3 if requested
if [ "$FROM_S3" = "from-s3" ]; then
    if [ -z "$S3_BUCKET" ]; then
        log_error "S3_BACKUP_BUCKET environment variable not set!"
        exit 1
    fi

    log_info "Downloading backup from S3..."
    mkdir -p "$BACKUP_DIR"

    if aws s3 cp "s3://${S3_BUCKET}/timescaledb-backups/${BACKUP_FILE}" "${BACKUP_DIR}/${BACKUP_FILE}"; then
        log_info "Download successful!"
    else
        log_error "Download from S3 failed!"
        exit 1
    fi
fi

# Check if backup file exists
BACKUP_PATH="${BACKUP_DIR}/${BACKUP_FILE}"
if [ ! -f "$BACKUP_PATH" ]; then
    log_error "Backup file not found: $BACKUP_PATH"
    log_info "Available backups:"
    ls -lh "$BACKUP_DIR"/best_lap_backup_*.sql.gz 2>/dev/null || echo "  No backups found"
    exit 1
fi

BACKUP_SIZE=$(du -h "$BACKUP_PATH" | cut -f1)
log_info "Found backup file: $BACKUP_FILE ($BACKUP_SIZE)"

# Confirmation prompt
log_warn "⚠️  WARNING: This will DROP and recreate the database!"
log_warn "Database: $DB_NAME"
log_warn "Container: $DB_CONTAINER"
read -p "Are you sure you want to continue? (yes/no): " CONFIRM

if [ "$CONFIRM" != "yes" ]; then
    log_info "Restore cancelled."
    exit 0
fi

# Stop services that depend on database
log_info "Stopping dependent services..."
docker-compose -f docker-compose.ec2.yml stop best-lap-api best-lap-metrics-collector 2>/dev/null || true

# Drop existing database and recreate
log_info "Dropping existing database..."
docker exec "$DB_CONTAINER" psql -U "$DB_USER" -d postgres -c "DROP DATABASE IF EXISTS $DB_NAME;"

log_info "Creating fresh database..."
docker exec "$DB_CONTAINER" psql -U "$DB_USER" -d postgres -c "CREATE DATABASE $DB_NAME OWNER $DB_USER;"

# Enable TimescaleDB extension
log_info "Enabling TimescaleDB extension..."
docker exec "$DB_CONTAINER" psql -U "$DB_USER" -d "$DB_NAME" -c "CREATE EXTENSION IF NOT EXISTS timescaledb;"

# Restore from backup
log_info "Restoring database from backup..."
if gunzip -c "$BACKUP_PATH" | docker exec -i "$DB_CONTAINER" psql -U "$DB_USER" -d "$DB_NAME"; then
    log_info "Database restored successfully!"
else
    log_error "Restore failed!"
    exit 1
fi

# Restart services
log_info "Restarting services..."
docker-compose -f docker-compose.ec2.yml start best-lap-api best-lap-metrics-collector

log_info "✅ Restore completed successfully!"
log_info "Restored from: $BACKUP_PATH"
