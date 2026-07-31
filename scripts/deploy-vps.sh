#!/bin/bash
# ============================================
# GYM-147 VPS Deploy Script
# ============================================
# Run on VPS as: bash deploy.sh

set -e
cd /opt/gym147/gym-147

echo "=== 1. KILL OLD PROCESSES ==="
pkill -f docker || true
sleep 3

echo "=== 2. UPDATE CODE ==="
git pull gitlab main

echo "=== 3. STOP OLD CONTAINERS ==="
docker compose -f docker-compose.vps-build.yml down 2>/dev/null || true

echo "=== 4. BUILD SERVICES (1 at a time to save RAM) ==="

echo "--- Building identity-service ---"
docker compose -f docker-compose.vps-build.yml build --no-cache identity-service

echo "--- Building member-service ---"
docker compose -f docker-compose.vps-build.yml build --no-cache member-service

echo "--- Building schedule-service ---"
docker compose -f docker-compose.vps-build.yml build --no-cache schedule-service

echo "--- Building billing-service ---"
docker compose -f docker-compose.vps-build.yml build --no-cache billing-service

echo "--- Building web-admin ---"
docker compose -f docker-compose.vps-build.yml build --no-cache web-admin

echo "=== 5. START ALL SERVICES ==="
docker compose -f docker-compose.vps-build.yml up -d

echo "=== 6. CHECK STATUS ==="
docker compose -f docker-compose.vps-build.yml ps

echo "=== DONE ==="
echo "Check: curl http://localhost/health"
