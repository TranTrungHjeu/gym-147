#!/bin/bash
# ================================
# Health Check Script
# GYM-147 Services
# ================================

set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo "======================================"
echo "  GYM-147 Health Check"
echo "======================================"

HEALTHY=0
UNHEALTHY=0

check_service() {
    local name=$1
    local url=$2
    
    if curl -sf "$url" > /dev/null 2>&1; then
        echo -e "${GREEN}✅ $name is healthy${NC}"
        HEALTHY=$((HEALTHY + 1))
    else
        echo -e "${RED}❌ $name is down${NC}"
        UNHEALTHY=$((UNHEALTHY + 1))
    fi
}

# Check all services
check_service "PostgreSQL" "localhost:5432"
check_service "Redis" "localhost:6380"
check_service "Identity Service" "localhost:3001/health"
check_service "Member Service" "localhost:3002/health"
check_service "Schedule Service" "localhost:3003/health"
check_service "Billing Service" "localhost:3004/health"
check_service "Web Admin" "localhost:3000/health"
check_service "API Gateway" "localhost/health"

echo "======================================"
echo "Summary: $HEALTHY healthy, $UNHEALTHY unhealthy"
echo "======================================"

if [ $UNHEALTHY -gt 0 ]; then
    exit 1
fi
