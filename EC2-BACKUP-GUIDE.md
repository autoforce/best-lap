# TimescaleDB Backup Guide for EC2

Complete guide for automated database backups on AWS EC2.

## 📋 Table of Contents

- [Overview](#overview)
- [Quick Start](#quick-start)
- [Backup Modes](#backup-modes)
- [Manual Operations](#manual-operations)
- [S3 Setup (Recommended)](#s3-setup-recommended)
- [Restore Procedures](#restore-procedures)
- [Monitoring](#monitoring)
- [Troubleshooting](#troubleshooting)

## Overview

The backup system provides:

✅ **Automated daily backups** (3 AM UTC)
✅ **Compression** (gzip reduces size by 90%+)
✅ **Retention policy** (keeps last 7 days)
✅ **S3 support** (optional, recommended for production)
✅ **Easy restore** (one-command recovery)

## Quick Start

### 1. Setup Automated Backups (Local Storage)

```bash
# SSH into EC2 instance
ssh ubuntu@your-ec2-ip

# Navigate to project directory
cd /path/to/best-lap

# Run setup script
./scripts/setup-backups-ec2.sh local
```

This will:
- Make backup scripts executable
- Create backup directory: `/home/ubuntu/backups/timescaledb`
- Configure cron job (daily at 3 AM)
- Run a test backup

### 2. Verify Setup

```bash
# Check cron job is configured
crontab -l | grep backup

# List available backups
ls -lh /home/ubuntu/backups/timescaledb/

# View backup logs
tail -f /home/ubuntu/backups/backup.log
```

## Backup Modes

### Local Storage (Default)

**Pros:**
- Simple setup
- Fast backup/restore
- No additional AWS costs

**Cons:**
- Lost if EC2 instance fails
- Limited by EBS storage

**Best for:** Development, testing, small projects

**Setup:**
```bash
./scripts/setup-backups-ec2.sh local
```

---

### S3 Storage (Recommended for Production)

**Pros:**
- Durable (99.999999999% durability)
- Survives EC2 failures
- Cost-effective ($0.023/GB/month)
- Can restore to any EC2 instance

**Cons:**
- Requires AWS CLI configuration
- Slightly slower restore

**Best for:** Production, critical data

**Setup:**
```bash
./scripts/setup-backups-ec2.sh s3
```

## S3 Setup (Recommended)

### 1. Create S3 Bucket

```bash
# Create bucket (one-time setup)
aws s3 mb s3://best-lap-backups --region us-east-1

# Enable versioning (optional, for extra safety)
aws s3api put-bucket-versioning \
  --bucket best-lap-backups \
  --versioning-configuration Status=Enabled

# Configure lifecycle policy (auto-delete after 30 days)
cat > lifecycle.json << 'EOF'
{
  "Rules": [
    {
      "Id": "DeleteOldBackups",
      "Status": "Enabled",
      "Prefix": "timescaledb-backups/",
      "Expiration": {
        "Days": 30
      }
    }
  ]
}
EOF

aws s3api put-bucket-lifecycle-configuration \
  --bucket best-lap-backups \
  --lifecycle-configuration file://lifecycle.json
```

### 2. Configure IAM Permissions

Create IAM policy for EC2 instance:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "s3:PutObject",
        "s3:GetObject",
        "s3:ListBucket",
        "s3:DeleteObject"
      ],
      "Resource": [
        "arn:aws:s3:::best-lap-backups",
        "arn:aws:s3:::best-lap-backups/*"
      ]
    }
  ]
}
```

Attach policy to EC2 instance role:
1. EC2 Console → Instances → Select instance
2. Actions → Security → Modify IAM role
3. Select role with above policy
4. Save

### 3. Configure Environment Variable

```bash
# Add to .env file
echo "S3_BACKUP_BUCKET=best-lap-backups" >> .env

# Export for current session
export S3_BACKUP_BUCKET=best-lap-backups

# Add to ~/.bashrc for persistence
echo "export S3_BACKUP_BUCKET=best-lap-backups" >> ~/.bashrc
source ~/.bashrc
```

### 4. Test S3 Backup

```bash
# Run manual backup to S3
./scripts/backup-timescaledb.sh s3

# Verify upload
aws s3 ls s3://best-lap-backups/timescaledb-backups/
```

## Manual Operations

### Create Manual Backup

```bash
# Local storage
./scripts/backup-timescaledb.sh local

# S3 storage
./scripts/backup-timescaledb.sh s3
```

### List Backups

```bash
# Local backups
ls -lh /home/ubuntu/backups/timescaledb/

# S3 backups
aws s3 ls s3://best-lap-backups/timescaledb-backups/ --human-readable
```

### Download Specific S3 Backup

```bash
# List available backups with dates
aws s3 ls s3://best-lap-backups/timescaledb-backups/

# Download specific backup
aws s3 cp s3://best-lap-backups/timescaledb-backups/best_lap_backup_20250227_030000.sql.gz \
  /home/ubuntu/backups/timescaledb/
```

## Restore Procedures

### Restore from Local Backup

```bash
# List available backups
ls -lh /home/ubuntu/backups/timescaledb/

# Restore specific backup
./scripts/restore-timescaledb.sh best_lap_backup_20250227_030000.sql.gz

# Confirm when prompted (type 'yes')
```

### Restore from S3 Backup

```bash
# List S3 backups
aws s3 ls s3://best-lap-backups/timescaledb-backups/

# Restore directly from S3
./scripts/restore-timescaledb.sh best_lap_backup_20250227_030000.sql.gz from-s3

# Confirm when prompted (type 'yes')
```

**⚠️ Warning:** Restore will:
1. Stop API and Metrics Collector
2. Drop existing database
3. Recreate database with backup data
4. Restart services

## Monitoring

### Check Backup Status

```bash
# View last backup result
tail -20 /home/ubuntu/backups/backup.log

# Follow backup logs in real-time
tail -f /home/ubuntu/backups/backup.log

# Check disk usage
df -h /home/ubuntu/backups/
```

### Verify Cron Job

```bash
# List cron jobs
crontab -l

# Check cron service status
systemctl status cron

# View cron execution logs
grep CRON /var/log/syslog | tail -20
```

### Backup Size Monitoring

```bash
# Total backup size
du -sh /home/ubuntu/backups/timescaledb/

# Individual backup sizes
du -h /home/ubuntu/backups/timescaledb/* | sort -h

# S3 bucket size
aws s3 ls s3://best-lap-backups/timescaledb-backups/ --recursive --summarize --human-readable
```

## Troubleshooting

### Backup Fails: "Docker container not found"

**Problem:** TimescaleDB container not running

**Solution:**
```bash
# Check container status
docker ps | grep timescaledb

# Start containers
docker-compose -f docker-compose.ec2.yml up -d

# Retry backup
./scripts/backup-timescaledb.sh local
```

### Backup Fails: "Permission denied"

**Problem:** Scripts not executable

**Solution:**
```bash
chmod +x scripts/backup-timescaledb.sh
chmod +x scripts/restore-timescaledb.sh
chmod +x scripts/setup-backups-ec2.sh
```

### S3 Upload Fails: "Access Denied"

**Problem:** IAM permissions not configured

**Solution:**
1. Verify IAM role is attached to EC2 instance
2. Check IAM policy includes S3 permissions
3. Test AWS CLI access: `aws s3 ls s3://best-lap-backups/`

### Restore Fails: "Database contains data"

**Problem:** Database not empty

**Solution:**
The restore script automatically drops and recreates the database. If this fails:
```bash
# Manually drop database
docker exec timescaledb psql -U best_lap -d postgres -c "DROP DATABASE IF EXISTS best_lap_db;"

# Retry restore
./scripts/restore-timescaledb.sh <backup_file>
```

### Disk Space Issues

**Problem:** Backup directory full

**Solution:**
```bash
# Check disk usage
df -h

# Manually clean old backups (keeps last 3)
cd /home/ubuntu/backups/timescaledb/
ls -t best_lap_backup_*.sql.gz | tail -n +4 | xargs rm

# Reduce retention period in backup script
# Edit BACKUP_RETENTION_DAYS in scripts/backup-timescaledb.sh
```

### Cron Job Not Running

**Problem:** Backups not running automatically

**Solution:**
```bash
# Check cron service
sudo systemctl status cron

# Start cron if stopped
sudo systemctl start cron

# Verify crontab entry
crontab -l | grep backup

# Check cron logs
grep CRON /var/log/syslog | tail -50

# Test manual backup
./scripts/backup-timescaledb.sh local
```

## Best Practices

### For Development/Testing
- Use **local storage** mode
- Keep 3-7 day retention
- Manual backups before major changes

### For Production
- Use **S3 storage** mode
- Keep 30 day retention (S3 lifecycle policy)
- Monitor backup logs weekly
- Test restore procedure monthly
- Enable S3 versioning for extra safety
- Set up CloudWatch alarms for backup failures

### Backup Schedule Recommendations

| Data Importance | Backup Frequency | Retention | Storage |
|----------------|------------------|-----------|---------|
| Development | Weekly | 7 days | Local |
| Staging | Daily | 14 days | S3 |
| Production | Daily + Weekly | 30 days | S3 |
| Critical | Multiple times/day | 90 days | S3 + Versioning |

### Cost Estimation (S3 Storage)

Example with daily backups:

```
Database size: 1 GB uncompressed
Compressed backup: ~100 MB (90% compression)
Daily backups: 30 × 100 MB = 3 GB stored

S3 Standard cost: 3 GB × $0.023/GB = $0.069/month (~$0.83/year)
```

Even with large databases, S3 backup costs are minimal:
- 10 GB database → ~1 GB compressed → ~$0.69/month
- 50 GB database → ~5 GB compressed → ~$3.45/month

## Advanced Configuration

### Change Backup Schedule

```bash
# Edit crontab
crontab -e

# Examples:
# Every 6 hours: 0 */6 * * *
# Twice daily (3 AM and 3 PM): 0 3,15 * * *
# Weekly on Sunday 3 AM: 0 3 * * 0
```

### Custom Retention Period

Edit `scripts/backup-timescaledb.sh`:

```bash
# Change this line (default: 7 days)
BACKUP_RETENTION_DAYS=14  # Keep 14 days instead
```

### Backup to Multiple Locations

```bash
# Create backup to both local and S3
./scripts/backup-timescaledb.sh local
./scripts/backup-timescaledb.sh s3
```

### Pre-backup Hook (e.g., Database Maintenance)

Add to crontab before backup:

```bash
# Run ANALYZE before backup (updates statistics)
0 2 * * * docker exec timescaledb psql -U best_lap -d best_lap_db -c "ANALYZE;"
0 3 * * * cd /path/to/best-lap && ./scripts/backup-timescaledb.sh s3
```

## Recovery Scenarios

### Scenario 1: Accidental Data Deletion

```bash
# Stop services immediately
docker-compose -f docker-compose.ec2.yml stop

# Restore from latest backup
./scripts/restore-timescaledb.sh $(ls -t /home/ubuntu/backups/timescaledb/*.sql.gz | head -1)
```

### Scenario 2: EC2 Instance Failure (S3 backups)

```bash
# On new EC2 instance
git clone <your-repo>
cd best-lap

# Deploy application
./scripts/deploy-ec2.sh

# Restore from S3
./scripts/restore-timescaledb.sh best_lap_backup_YYYYMMDD_HHMMSS.sql.gz from-s3
```

### Scenario 3: Migrate to New EC2 Instance

```bash
# On old instance: create backup
./scripts/backup-timescaledb.sh s3

# On new instance: restore
./scripts/restore-timescaledb.sh <backup_file> from-s3
```

## Summary

✅ **Setup once**: `./scripts/setup-backups-ec2.sh s3`
✅ **Automatic daily backups**: No manual intervention needed
✅ **Easy restore**: One command to recover
✅ **Cost-effective**: <$1/month for typical usage
✅ **Production-ready**: S3 durability + retention policies

For questions or issues, check the troubleshooting section or review backup logs.
