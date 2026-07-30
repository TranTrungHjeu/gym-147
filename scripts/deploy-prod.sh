#!/bin/bash
# ================================
# Production Deployment Script
# GYM-147
# ================================

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
PROJECT_NAME="gym-147"
DEPLOY_PATH="${DEPLOY_PATH:-/opt/gym-147}"
REGISTRY="${REGISTRY:-ghcr.io}"
REPO_NAME="${REPO_NAME:-TranTrungHieu/gym-147}"

echo -e "${BLUE}======================================${NC}"
echo -e "${BLUE}  GYM-147 Deployment Script${NC}"
echo -e "${BLUE}======================================${NC}"

# Check if running as root
if [[ $EUID -ne 0 ]]; then
   echo -e "${RED}❌ Please run as root or use sudo${NC}"
   exit 1
fi

# Check for required commands
command -v docker >/dev/null 2>&1 || { echo -e "${RED}❌ Docker is required but not installed${NC}"; exit 1; }
command -v git >/dev/null 2>&1 || { echo -e "${RED}❌ Git is required but not installed${NC}"; exit 1; }

# Step 1: Update system
echo -e "${YELLOW}📦 Updating system packages...${NC}"
apt-get update -qq

# Step 2: Install Docker if not present
if ! command -v docker &> /dev/null; then
    echo -e "${YELLOW}🐳 Installing Docker...${NC}"
    curl -fsSL https://get.docker.com -o get-docker.sh
    sh get-docker.sh
    systemctl enable docker
    rm get-docker.sh
fi

# Step 3: Install Docker Compose
if ! docker compose version &> /dev/null; then
    echo -e "${YELLOW}📦 Installing Docker Compose...${NC}"
    curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
    chmod +x /usr/local/bin/docker-compose
fi

# Step 4: Create deployment directory
echo -e "${YELLOW}📁 Creating deployment directory...${NC}"
mkdir -p "$DEPLOY_PATH"
cd "$DEPLOY_PATH"

# Step 5: Pull latest code
echo -e "${YELLOW}🔄 Pulling latest code...${NC}"
if [ -d ".git" ]; then
    git pull origin main
else
    git clone https://github.com/${REPO_NAME}.git "$DEPLOY_PATH"
fi

# Step 6: Create environment file
echo -e "${YELLOW}⚙️ Setting up environment...${NC}"
if [ ! -f ".env" ]; then
    cp infrastructure/docker/.env.example .env
    echo -e "${YELLOW}⚠️ Please edit .env file with your production values!${NC}"
    echo -e "${YELLOW}⚠️ Especially: JWT_SECRET, POSTGRES_PASSWORD, REDIS_PASSWORD${NC}"
fi

# Step 7: Create necessary directories
echo -e "${YELLOW}📂 Creating data directories...${NC}"
mkdir -p /var/log/gym-147
mkdir -p /var/www/gym-147/static
mkdir -p ${DEPLOY_PATH}/data/redis

# Step 8: Build and start containers
echo -e "${YELLOW}🚀 Building Docker images...${NC}"
docker compose -f docker-compose.prod.yml build --no-cache

echo -e "${YELLOW}🚀 Starting services...${NC}"
docker compose -f docker-compose.prod.yml up -d

# Step 9: Wait for services
echo -e "${YELLOW}⏳ Waiting for services to be healthy...${NC}"
sleep 30

# Step 10: Run migrations
echo -e "${YELLOW}🗄️ Running database migrations...${NC}"
docker compose -f docker-compose.prod.yml exec -T identity-service npx prisma migrate deploy || true
docker compose -f docker-compose.prod.yml exec -T member-service npx prisma migrate deploy || true
docker compose -f docker-compose.prod.yml exec -T schedule-service npx prisma migrate deploy || true
docker compose -f docker-compose.prod.yml exec -T billing-service npx prisma migrate deploy || true

# Step 11: Show status
echo -e "${BLUE}======================================${NC}"
echo -e "${GREEN}✅ Deployment completed!${NC}"
echo -e "${BLUE}======================================${NC}"
echo ""
echo -e "${GREEN}📊 Service Status:${NC}"
docker compose -f docker-compose.prod.yml ps
echo ""
echo -e "${GREEN}🌐 URLs:${NC}"
echo "  - Web Admin: http://$(hostname -I | awk '{print $1}'):3000"
echo "  - API Gateway: http://$(hostname -I | awk '{print $1}')"
echo "  - Portainer: https://$(hostname -I | awk '{print $1}'):9443"
echo ""
echo -e "${YELLOW}📝 Useful Commands:${NC}"
echo "  - View logs: docker compose -f docker-compose.prod.yml logs -f"
echo "  - Restart: docker compose -f docker-compose.prod.yml restart"
echo "  - Stop: docker compose -f docker-compose.prod.yml down"
