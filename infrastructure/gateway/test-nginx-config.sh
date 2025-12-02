#!/bin/sh
# Test script to validate nginx configuration
# This can be run locally to test the nginx.conf.template

set -e

echo "Testing nginx configuration..."

# Set test environment variables
export IDENTITY_SERVICE_HOST="identity-service:3001"
export MEMBER_SERVICE_HOST="member-service:3002"
export SCHEDULE_SERVICE_HOST="schedule-service:3003"
export BILLING_SERVICE_HOST="billing-service:3004"

# Substitute environment variables
envsubst '${IDENTITY_SERVICE_HOST} ${MEMBER_SERVICE_HOST} ${SCHEDULE_SERVICE_HOST} ${BILLING_SERVICE_HOST}' \
  < nginx.conf.template \
  > /tmp/test-nginx.conf

echo "Generated test nginx.conf at /tmp/test-nginx.conf"

# Test nginx configuration
if command -v nginx &> /dev/null; then
    echo "Validating nginx configuration..."
    nginx -t -c /tmp/test-nginx.conf
    echo "✅ Nginx configuration is valid!"
else
    echo "⚠️  nginx command not found. Cannot validate configuration syntax."
    echo "Please check manually or run this in a container with nginx installed."
fi
