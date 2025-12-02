#!/bin/sh
# Entrypoint script for Gateway - substitutes environment variables in nginx.conf

set -e

# Function to extract protocol from URL
extract_protocol() {
    local url="$1"
    case "$url" in
        https://*)
            echo "https"
            ;;
        http://*)
            echo "http"
            ;;
        *)
            echo "http"
            ;;
    esac
}

# Function to extract hostname:port from URL
extract_host_port() {
    local url="$1"
    url="${url#http://}"
    url="${url#https://}"
    # Remove trailing slash if present
    url="${url%/}"
    echo "$url"
}

# Default values if not set - using Railway private networking
IDENTITY_SERVICE_URL=${IDENTITY_SERVICE_URL:-identity-service:3001}
MEMBER_SERVICE_URL=${MEMBER_SERVICE_URL:-member-service:3002}
SCHEDULE_SERVICE_URL=${SCHEDULE_SERVICE_URL:-schedule-service:3003}
BILLING_SERVICE_URL=${BILLING_SERVICE_URL:-billing-service:3004}

# Extract protocol (for HTTPS support with public URLs)
IDENTITY_SERVICE_PROTO=$(extract_protocol "$IDENTITY_SERVICE_URL")
MEMBER_SERVICE_PROTO=$(extract_protocol "$MEMBER_SERVICE_URL")
SCHEDULE_SERVICE_PROTO=$(extract_protocol "$SCHEDULE_SERVICE_URL")
BILLING_SERVICE_PROTO=$(extract_protocol "$BILLING_SERVICE_URL")

# Extract hostname:port
IDENTITY_SERVICE_HOST=$(extract_host_port "$IDENTITY_SERVICE_URL")
MEMBER_SERVICE_HOST=$(extract_host_port "$MEMBER_SERVICE_URL")
SCHEDULE_SERVICE_HOST=$(extract_host_port "$SCHEDULE_SERVICE_URL")
BILLING_SERVICE_HOST=$(extract_host_port "$BILLING_SERVICE_URL")

# Build full URL (protocol://hostname:port) for proxy_pass with variables
IDENTITY_SERVICE_FULL="${IDENTITY_SERVICE_PROTO}://${IDENTITY_SERVICE_HOST}"
MEMBER_SERVICE_FULL="${MEMBER_SERVICE_PROTO}://${MEMBER_SERVICE_HOST}"
SCHEDULE_SERVICE_FULL="${SCHEDULE_SERVICE_PROTO}://${SCHEDULE_SERVICE_HOST}"
BILLING_SERVICE_FULL="${BILLING_SERVICE_PROTO}://${BILLING_SERVICE_HOST}"

# Export for envsubst
export IDENTITY_SERVICE_PROTO
export IDENTITY_SERVICE_HOST
export IDENTITY_SERVICE_FULL
export MEMBER_SERVICE_PROTO
export MEMBER_SERVICE_HOST
export MEMBER_SERVICE_FULL
export SCHEDULE_SERVICE_PROTO
export SCHEDULE_SERVICE_HOST
export SCHEDULE_SERVICE_FULL
export BILLING_SERVICE_PROTO
export BILLING_SERVICE_HOST
export BILLING_SERVICE_FULL

# Substitute environment variables in nginx.conf.template
envsubst '${IDENTITY_SERVICE_PROTO} ${IDENTITY_SERVICE_HOST} ${IDENTITY_SERVICE_FULL} ${MEMBER_SERVICE_PROTO} ${MEMBER_SERVICE_HOST} ${MEMBER_SERVICE_FULL} ${SCHEDULE_SERVICE_PROTO} ${SCHEDULE_SERVICE_HOST} ${SCHEDULE_SERVICE_FULL} ${BILLING_SERVICE_PROTO} ${BILLING_SERVICE_HOST} ${BILLING_SERVICE_FULL}' \
  < /etc/nginx/templates/nginx.conf.template \
  > /etc/nginx/nginx.conf

# Validate nginx configuration before starting
echo "Validating nginx configuration..."
nginx -t

if [ $? -ne 0 ]; then
    echo "ERROR: Nginx configuration validation failed!"
    echo "Generated config file:"
    cat /etc/nginx/nginx.conf
    exit 1
fi

echo "✅ Nginx configuration is valid. Starting nginx..."

# Start nginx
exec nginx -g 'daemon off;'