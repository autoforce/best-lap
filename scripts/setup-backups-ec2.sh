#!/bin/bash

# Setup Automated Backups on EC2
# This script configures cron jobs for automated TimescaleDB backups
# Usage: ./scripts/setup-backups-ec2.sh [local|s3]

set -e

BACKUP_MODE="${1:-local}"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"

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

log_info "Setting up automated backups on EC2..."
log_info "Mode: $BACKUP_MODE"

# Make scripts executable
chmod +x "${SCRIPT_DIR}/backup-timescaledb.sh"
chmod +x "${SCRIPT_DIR}/restore-timescaledb.sh"
log_info "Made backup scripts executable"

# Create backup directory
mkdir -p /home/ubuntu/backups/timescaledb
log_info "Created backup directory: /home/ubuntu/backups/timescaledb"

# Setup cron job
CRON_SCHEDULE="0 3 * * *"  # 3 AM daily
CRON_COMMAND="cd $PROJECT_DIR && ${SCRIPT_DIR}/backup-timescaledb.sh $BACKUP_MODE >> /home/ubuntu/backups/backup.log 2>&1"
CRON_ENTRY="$CRON_SCHEDULE $CRON_COMMAND"

# Check if cron job already exists
if crontab -l 2>/dev/null | grep -q "backup-timescaledb.sh"; then
    log_warn "Cron job already exists. Removing old entry..."
    crontab -l 2>/dev/null | grep -v "backup-timescaledb.sh" | crontab -
fi

# Add new cron job
log_info "Adding cron job (runs daily at 3 AM)..."
(crontab -l 2>/dev/null; echo "$CRON_ENTRY") | crontab -

# Verify cron job was added
if crontab -l | grep -q "backup-timescaledb.sh"; then
    log_info "✅ Cron job configured successfully!"
    log_info ""
    log_info "Current crontab:"
    crontab -l | grep "backup-timescaledb.sh"
else
    log_error "Failed to configure cron job"
    exit 1
fi

# S3 setup instructions
if [ "$BACKUP_MODE" = "s3" ]; then
    log_info ""
    log_warn "📝 S3 Configuration Required:"
    log_warn "1. Create S3 bucket for backups"
    log_warn "2. Configure AWS CLI on EC2:"
    log_warn "   aws configure"
    log_warn "3. Set S3_BACKUP_BUCKET environment variable:"
    log_warn "   export S3_BACKUP_BUCKET=your-bucket-name"
    log_warn "4. Add to .env file:"
    log_warn "   S3_BACKUP_BUCKET=your-bucket-name"
    log_info ""
fi

# Test backup
log_info ""
log_info "Running test backup..."
if "${SCRIPT_DIR}/backup-timescaledb.sh" "$BACKUP_MODE"; then
    log_info "✅ Test backup successful!"
else
    log_error "Test backup failed!"
    exit 1
fi

# Show available backups
log_info ""
log_info "Available backups:"
ls -lh /home/ubuntu/backups/timescaledb/

log_info ""
log_info "✅ Backup setup completed!"
log_info ""
log_info "📚 Usage:"
log_info "  - Backups run automatically every day at 3 AM"
log_info "  - Manual backup: ./scripts/backup-timescaledb.sh $BACKUP_MODE"
log_info "  - Restore: ./scripts/restore-timescaledb.sh <backup_file>"
log_info "  - View backup logs: tail -f /home/ubuntu/backups/backup.log"
log_info "  - List backups: ls -lh /home/ubuntu/backups/timescaledb/"
if [ "$BACKUP_MODE" = "s3" ]; then
    log_info "  - List S3 backups: aws s3 ls s3://\$S3_BACKUP_BUCKET/timescaledb-backups/"
fi
