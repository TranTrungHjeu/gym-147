#!/bin/bash
# Script to regenerate Prisma Client in production container
# Usage: docker exec billing-service sh /app/services/billing-service/regenerate-prisma.sh

cd /app/services/billing-service
echo "Regenerating Prisma Client..."
npx prisma generate
echo "Prisma Client regenerated successfully!"
echo "Please restart the service for changes to take effect."

