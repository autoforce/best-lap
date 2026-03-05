#!/bin/bash

# EC2 Deployment Script for Best Lap
# Deploys TimescaleDB + Redis (database-only) on EC2
# For full stack deployment, use docker-compose.ec2.yml instead
#
# Usage:
#   ./scripts/deploy-ec2.sh              # Deploy/update
#   ./scripts/deploy-ec2.sh --rebuild    # Force rebuild images

set -e

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
REBUILD_FLAG="${1:-}"
COMPOSE_FILE="docker-compose.db.yml"
PROJECT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

log_info() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

log_warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

log_step() {
    echo -e "${BLUE}[STEP]${NC} $1"
}

# Navigate to project directory
cd "$PROJECT_DIR"

log_info "Starting EC2 deployment (TimescaleDB ONLY)"
log_info "Project directory: $PROJECT_DIR"
log_info "Compose file: $COMPOSE_FILE"

# Check if Docker is installed
if ! command -v docker &> /dev/null; then
    log_error "Docker is not installed. Please install Docker first."
    exit 1
fi

if ! command -v docker-compose &> /dev/null; then
    log_error "Docker Compose is not installed. Please install Docker Compose first."
    exit 1
fi

# Check if .env file exists
if [ ! -f .env ]; then
    log_warn ".env file not found!"
    log_info "Creating .env file from template..."
    cat > .env << 'EOF'
# Database Configuration
DB_HOST=localhost
DB_PORT=5432
DB_USER=best_lap
DB_PASSWORD=best_lap
DB_NAME=best_lap_db

# Redis Configuration
REDIS_HOST=localhost
REDIS_PORT=6379
# REDIS_PASSWORD=  # Optional, uncomment to set password
EOF
    log_info ".env file created. Please update with production values."
fi

# Stop existing containers
log_step "1/5 Stopping existing containers..."
docker-compose -f "$COMPOSE_FILE" down || true

# Pull latest images
log_step "2/5 Pulling latest Docker images..."
docker-compose -f "$COMPOSE_FILE" pull

# Rebuild if requested
if [ "$REBUILD_FLAG" == "--rebuild" ]; then
    log_step "3/5 Rebuilding Docker images (forced)..."
    docker-compose -f "$COMPOSE_FILE" build --no-cache
else
    log_step "3/5 Building Docker images (using cache)..."
    docker-compose -f "$COMPOSE_FILE" build
fi

# Start containers
log_step "4/5 Starting containers..."
docker-compose -f "$COMPOSE_FILE" up -d

# Wait for services to be healthy
log_step "5/5 Waiting for services to be healthy..."
sleep 5

# Check TimescaleDB health
log_info "Checking TimescaleDB health..."
MAX_RETRIES=30
RETRY_COUNT=0
until docker exec timescaledb pg_isready -U best_lap -d best_lap_db > /dev/null 2>&1; do
    RETRY_COUNT=$((RETRY_COUNT+1))
    if [ $RETRY_COUNT -ge $MAX_RETRIES ]; then
        log_error "TimescaleDB failed to start within 30 seconds"
        docker-compose -f "$COMPOSE_FILE" logs timescaledb
        exit 1
    fi
    echo -n "."
    sleep 1
done
echo ""
log_info "✅ TimescaleDB is healthy!"

# Redis is on Redis Cloud (external), not on EC2

# Enable TimescaleDB extension
log_info "Ensuring TimescaleDB extension is enabled..."
docker exec timescaledb psql -U best_lap -d best_lap_db -c "CREATE EXTENSION IF NOT EXISTS timescaledb;" || true

# Show container status
log_info ""
log_info "==================================="
log_info "Deployment completed successfully!"
log_info "==================================="
echo ""
docker-compose -f "$COMPOSE_FILE" ps

log_info ""
log_info "📊 Service URLs:"
log_info "  TimescaleDB: localhost:5432 (or EC2_PUBLIC_IP:5432 from outside)"

log_info ""
log_info "🔧 Useful commands:"
log_info "  View logs: docker-compose -f $COMPOSE_FILE logs -f"
log_info "  Stop services: docker-compose -f $COMPOSE_FILE down"
log_info "  Connect to DB: docker exec -it timescaledb psql -U best_lap -d best_lap_db"
log_info "  Check TimescaleDB extension: docker exec timescaledb psql -U best_lap -d best_lap_db -c \"SELECT extversion FROM pg_extension WHERE extname='timescaledb';\""

log_info ""
log_warn "⚠️  NEXT STEPS:"
log_warn "1. Get EC2 public IP: curl ifconfig.me"
log_warn "2. Configure EC2 Security Group to allow port 5432 from Render IPs"
log_warn "3. Setup Redis Cloud (https://redis.com/try-free/) - Free tier available"
log_warn "4. Update DB_PASSWORD in .env for production"
log_warn "5. Configure in Render:"
log_warn "   - DB_HOST: <EC2_PUBLIC_IP>"
log_warn "   - DB_PASSWORD: <your_password>"
log_warn "   - REDIS_HOST: <redis_cloud_host>"
log_warn "   - REDIS_PASSWORD: <redis_cloud_password>"
log_warn "6. Deploy services on Render (API, Admin, Metrics Collector, Dashboard)"
log_warn "7. Migrations will run automatically on first API deploy"
