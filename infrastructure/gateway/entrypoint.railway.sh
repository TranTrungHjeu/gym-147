#!/bin/sh
# Entrypoint script for Gateway on Railway - substitutes environment variables in nginx.conf

set -e

# Debug: Log that this script is running
echo "[00-process-template.sh] Starting template processing..."

# Function to extract hostname:port from URL (nginx upstream needs hostname:port, not full URL)
extract_host_port() {
    local url="$1"
    # Remove protocol prefix
    url="${url#http://}"
    url="${url#https://}"
    # Remove trailing slash if present
    url="${url%/}"
    echo "$url"
}

# Railway provides PORT environment variable - default to 80 if not set
NGINX_PORT=${PORT:-80}
export NGINX_PORT

# Default values if not set
IDENTITY_SERVICE_URL_INPUT=${IDENTITY_SERVICE_URL:-http://localhost:3001}
MEMBER_SERVICE_URL_INPUT=${MEMBER_SERVICE_URL:-http://localhost:3002}
SCHEDULE_SERVICE_URL_INPUT=${SCHEDULE_SERVICE_URL:-http://localhost:3003}
BILLING_SERVICE_URL_INPUT=${BILLING_SERVICE_URL:-http://localhost:3004}

# Extract hostname:port for nginx upstream (upstream blocks don't accept full URLs with protocol)
IDENTITY_SERVICE_URL=$(extract_host_port "$IDENTITY_SERVICE_URL_INPUT")
MEMBER_SERVICE_URL=$(extract_host_port "$MEMBER_SERVICE_URL_INPUT")
SCHEDULE_SERVICE_URL=$(extract_host_port "$SCHEDULE_SERVICE_URL_INPUT")
BILLING_SERVICE_URL=$(extract_host_port "$BILLING_SERVICE_URL_INPUT")

# Export for envsubst
export IDENTITY_SERVICE_URL
export MEMBER_SERVICE_URL
export SCHEDULE_SERVICE_URL
export BILLING_SERVICE_URL

# Debug: Show environment variables
echo "[00-process-template.sh] NGINX_PORT=${NGINX_PORT}"
echo "[00-process-template.sh] IDENTITY_SERVICE_URL=${IDENTITY_SERVICE_URL}"
echo "[00-process-template.sh] MEMBER_SERVICE_URL=${MEMBER_SERVICE_URL}"
echo "[00-process-template.sh] SCHEDULE_SERVICE_URL=${SCHEDULE_SERVICE_URL}"
echo "[00-process-template.sh] BILLING_SERVICE_URL=${BILLING_SERVICE_URL}"

# Substitute environment variables in nginx.conf.template
# This script runs as part of nginx default entrypoint (in /docker-entrypoint.d/)
# It processes the template BEFORE nginx default template processor runs
echo "[00-process-template.sh] Processing nginx.conf.template..."
envsubst '${NGINX_PORT} ${IDENTITY_SERVICE_URL} ${MEMBER_SERVICE_URL} ${SCHEDULE_SERVICE_URL} ${BILLING_SERVICE_URL}' \
  < /etc/nginx/templates/nginx.conf.template \
  > /etc/nginx/nginx.conf

# Remove template file to prevent nginx default entrypoint from processing it again
# (nginx default entrypoint will run envsubst on all .template files, but we've already done it)
echo "[00-process-template.sh] Removing template file to prevent duplicate processing..."
rm -f /etc/nginx/templates/nginx.conf.template

echo "[00-process-template.sh] Template processing complete!"
