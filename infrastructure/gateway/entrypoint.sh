#!/bin/sh
# Entrypoint script for Gateway - substitutes environment variables in nginx.conf

set -e

# Default values if not set
IDENTITY_SERVICE_URL=${IDENTITY_SERVICE_URL:-http://localhost:3001}
MEMBER_SERVICE_URL=${MEMBER_SERVICE_URL:-http://localhost:3002}
SCHEDULE_SERVICE_URL=${SCHEDULE_SERVICE_URL:-http://localhost:3003}
BILLING_SERVICE_URL=${BILLING_SERVICE_URL:-http://localhost:3004}

# Substitute environment variables in nginx.conf.template
envsubst '${IDENTITY_SERVICE_URL} ${MEMBER_SERVICE_URL} ${SCHEDULE_SERVICE_URL} ${BILLING_SERVICE_URL}' \
  < /etc/nginx/templates/nginx.conf.template \
  > /etc/nginx/nginx.conf

# Start nginx
exec nginx -g 'daemon off;'
