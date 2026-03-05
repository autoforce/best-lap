#!/bin/bash

# TimescaleDB Backup Script for EC2
# Creates compressed backups with rotation (keeps last 7 days)
# Usage: ./scripts/backup-timescaledb.sh [local|s3]

set -e

# Configuration
BACKUP_MODE="${1:-local}"  # local or s3
BACKUP_DIR="/home/ubuntu/backups/timescaledb"
BACKUP_RETENTION_DAYS=7
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="best_lap_backup_${TIMESTAMP}.sql.gz"
S3_BUCKET="${S3_BACKUP_BUCKET:-}"  # Set via env var

# Database credentials from .env
DB_CONTAINER="timescaledb"
DB_NAME="best_lap_db"
DB_USER="best_lap"
DB_PASSWORD="${DB_PASSWORD:-best_lap_password}"

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

log_info() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

log_warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Create backup directory if it doesn't exist
mkdir -p "$BACKUP_DIR"

log_info "Starting TimescaleDB backup..."
log_info "Mode: $BACKUP_MODE"
log_info "Backup file: $BACKUP_FILE"

# Create backup using pg_dump inside Docker container
log_info "Running pg_dump..."
if docker exec "$DB_CONTAINER" pg_dump -U "$DB_USER" -d "$DB_NAME" --format=plain --no-owner --no-acl | gzip > "${BACKUP_DIR}/${BACKUP_FILE}"; then
    BACKUP_SIZE=$(du -h "${BACKUP_DIR}/${BACKUP_FILE}" | cut -f1)
    log_info "Backup created successfully! Size: $BACKUP_SIZE"
else
    log_error "Backup failed!"
    exit 1
fi

# Upload to S3 if enabled
if [ "$BACKUP_MODE" = "s3" ]; then
    if [ -z "$S3_BUCKET" ]; then
        log_error "S3_BACKUP_BUCKET environment variable not set!"
        exit 1
    fi

    log_info "Uploading to S3 bucket: $S3_BUCKET..."
    if aws s3 cp "${BACKUP_DIR}/${BACKUP_FILE}" "s3://${S3_BUCKET}/timescaledb-backups/${BACKUP_FILE}"; then
        log_info "Upload to S3 successful!"
    else
        log_error "S3 upload failed!"
        exit 1
    fi
fi

# Clean up old backups (keep last 7 days)
log_info "Cleaning up old backups (keeping last $BACKUP_RETENTION_DAYS days)..."
find "$BACKUP_DIR" -name "best_lap_backup_*.sql.gz" -type f -mtime +$BACKUP_RETENTION_DAYS -delete
REMAINING_BACKUPS=$(find "$BACKUP_DIR" -name "best_lap_backup_*.sql.gz" -type f | wc -l)
log_info "Local backups retained: $REMAINING_BACKUPS"

# Clean up old S3 backups if enabled
if [ "$BACKUP_MODE" = "s3" ] && [ -n "$S3_BUCKET" ]; then
    log_info "Cleaning up old S3 backups..."
    CUTOFF_DATE=$(date -d "$BACKUP_RETENTION_DAYS days ago" +%Y%m%d)

    aws s3 ls "s3://${S3_BUCKET}/timescaledb-backups/" | while read -r line; do
        FILE=$(echo "$line" | awk '{print $4}')
        if [[ "$FILE" =~ best_lap_backup_([0-9]{8})_ ]]; then
            FILE_DATE="${BASH_REMATCH[1]}"
            if [ "$FILE_DATE" -lt "$CUTOFF_DATE" ]; then
                log_info "Deleting old S3 backup: $FILE"
                aws s3 rm "s3://${S3_BUCKET}/timescaledb-backups/$FILE"
            fi
        fi
    done
fi

log_info "Backup completed successfully!"
log_info "Backup location: ${BACKUP_DIR}/${BACKUP_FILE}"
if [ "$BACKUP_MODE" = "s3" ]; then
    log_info "S3 location: s3://${S3_BUCKET}/timescaledb-backups/${BACKUP_FILE}"
fi
