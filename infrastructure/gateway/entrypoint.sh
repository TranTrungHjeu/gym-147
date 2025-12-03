#!/bin/sh
set -e

# Extract host and port from Railway service URLs if provided
# Railway provides service URLs in format: https://service-name.up.railway.app
# For private networking within same Railway project, services can reference each other by service name

# Function to extract host from URL
extract_host() {
    local url=$1
    local default=$2
    
    if [ -z "$url" ]; then
        echo "$default"
        return
    fi
    
    # Remove protocol
    url=${url#http://}
    url=${url#https://}
    
    # Extract host (remove port if present)
    echo "$url" | cut -d: -f1
}

# Function to extract port from URL
extract_port() {
    local url=$1
    local default=$2
    local original_url="$1"
    
    if [ -z "$url" ]; then
        echo "$default"
        return
    fi
    
    # Remove protocol
    url=${url#http://}
    url=${url#https://}
    
    # Extract port
    if echo "$url" | grep -q ':'; then
        echo "$url" | cut -d: -f2
    else
        # No port specified - for Railway, use port 80 for HTTP proxy
        # Railway public URLs are HTTPS but internal proxy should use HTTP on port 80
        echo "80"
    fi
}

# Function to detect if URL is HTTPS
is_https_url() {
    local url=$1
    if echo "$url" | grep -q '^https://'; then
        return 0
    else
        return 1
    fi
}

# Set defaults if not provided
# Priority: HOST/PORT env vars > URL env var > defaults
if [ -z "$IDENTITY_SERVICE_HOST" ] && [ -n "$IDENTITY_SERVICE_URL" ]; then
    IDENTITY_SERVICE_HOST=$(extract_host "$IDENTITY_SERVICE_URL" "identity")
fi
IDENTITY_SERVICE_HOST=${IDENTITY_SERVICE_HOST:-identity}

if [ -z "$IDENTITY_SERVICE_PORT" ] && [ -n "$IDENTITY_SERVICE_URL" ]; then
    IDENTITY_SERVICE_PORT=$(extract_port "$IDENTITY_SERVICE_URL" "3001")
fi
IDENTITY_SERVICE_PORT=${IDENTITY_SERVICE_PORT:-3001}

if [ -z "$MEMBER_SERVICE_HOST" ] && [ -n "$MEMBER_SERVICE_URL" ]; then
    MEMBER_SERVICE_HOST=$(extract_host "$MEMBER_SERVICE_URL" "member")
fi
MEMBER_SERVICE_HOST=${MEMBER_SERVICE_HOST:-member}

if [ -z "$MEMBER_SERVICE_PORT" ] && [ -n "$MEMBER_SERVICE_URL" ]; then
    MEMBER_SERVICE_PORT=$(extract_port "$MEMBER_SERVICE_URL" "3002")
fi
MEMBER_SERVICE_PORT=${MEMBER_SERVICE_PORT:-3002}

if [ -z "$SCHEDULE_SERVICE_HOST" ] && [ -n "$SCHEDULE_SERVICE_URL" ]; then
    SCHEDULE_SERVICE_HOST=$(extract_host "$SCHEDULE_SERVICE_URL" "schedule")
fi
SCHEDULE_SERVICE_HOST=${SCHEDULE_SERVICE_HOST:-schedule}

if [ -z "$SCHEDULE_SERVICE_PORT" ] && [ -n "$SCHEDULE_SERVICE_URL" ]; then
    SCHEDULE_SERVICE_PORT=$(extract_port "$SCHEDULE_SERVICE_URL" "3003")
fi
SCHEDULE_SERVICE_PORT=${SCHEDULE_SERVICE_PORT:-3003}

if [ -z "$BILLING_SERVICE_HOST" ] && [ -n "$BILLING_SERVICE_URL" ]; then
    BILLING_SERVICE_HOST=$(extract_host "$BILLING_SERVICE_URL" "billing")
fi
BILLING_SERVICE_HOST=${BILLING_SERVICE_HOST:-billing}

if [ -z "$BILLING_SERVICE_PORT" ] && [ -n "$BILLING_SERVICE_URL" ]; then
    # Extract port from URL, but if no port in URL, use default 3004 for billing service
    BILLING_SERVICE_PORT=$(extract_port "$BILLING_SERVICE_URL" "3004")
fi
# Default to 3004 if not set (billing service runs on port 3004)
BILLING_SERVICE_PORT=${BILLING_SERVICE_PORT:-3004}

# Default PORT to 80 if not set (Railway provides this automatically)
export PORT=${PORT:-80}

# Detect protocol for each service (for future use if needed)
IDENTITY_SERVICE_PROTOCOL="http"
MEMBER_SERVICE_PROTOCOL="http"
SCHEDULE_SERVICE_PROTOCOL="http"
BILLING_SERVICE_PROTOCOL="http"

if [ -n "$IDENTITY_SERVICE_URL" ] && is_https_url "$IDENTITY_SERVICE_URL"; then
    IDENTITY_SERVICE_PROTOCOL="https"
fi
if [ -n "$MEMBER_SERVICE_URL" ] && is_https_url "$MEMBER_SERVICE_URL"; then
    MEMBER_SERVICE_PROTOCOL="https"
fi
if [ -n "$SCHEDULE_SERVICE_URL" ] && is_https_url "$SCHEDULE_SERVICE_URL"; then
    SCHEDULE_SERVICE_PROTOCOL="https"
fi
if [ -n "$BILLING_SERVICE_URL" ] && is_https_url "$BILLING_SERVICE_URL"; then
    BILLING_SERVICE_PROTOCOL="https"
fi

# Export variables for envsubst
export IDENTITY_SERVICE_HOST
export IDENTITY_SERVICE_PORT
export IDENTITY_SERVICE_PROTOCOL
export MEMBER_SERVICE_HOST
export MEMBER_SERVICE_PORT
export MEMBER_SERVICE_PROTOCOL
export SCHEDULE_SERVICE_HOST
export SCHEDULE_SERVICE_PORT
export SCHEDULE_SERVICE_PROTOCOL
export BILLING_SERVICE_HOST
export BILLING_SERVICE_PORT
export BILLING_SERVICE_PROTOCOL

# Log configuration (force output to stderr so Railway can see it)
echo "=== Gateway Configuration ===" >&2
echo "PORT: $PORT" >&2
echo "IDENTITY_SERVICE: ${IDENTITY_SERVICE_PROTOCOL}://${IDENTITY_SERVICE_HOST}:${IDENTITY_SERVICE_PORT}" >&2
echo "MEMBER_SERVICE: ${MEMBER_SERVICE_PROTOCOL}://${MEMBER_SERVICE_HOST}:${MEMBER_SERVICE_PORT}" >&2
echo "SCHEDULE_SERVICE: ${SCHEDULE_SERVICE_PROTOCOL}://${SCHEDULE_SERVICE_HOST}:${SCHEDULE_SERVICE_PORT}" >&2
echo "BILLING_SERVICE: ${BILLING_SERVICE_PROTOCOL}://${BILLING_SERVICE_HOST}:${BILLING_SERVICE_PORT}" >&2
echo "=============================" >&2
echo "" >&2
echo "Environment variables check:" >&2
echo "  IDENTITY_SERVICE_URL: ${IDENTITY_SERVICE_URL:-not set}" >&2
echo "  MEMBER_SERVICE_URL: ${MEMBER_SERVICE_URL:-not set}" >&2
echo "  SCHEDULE_SERVICE_URL: ${SCHEDULE_SERVICE_URL:-not set}" >&2
echo "  BILLING_SERVICE_URL: ${BILLING_SERVICE_URL:-not set}" >&2
echo "=============================" >&2

# Generate nginx.conf from template
echo "Generating nginx.conf from template..." >&2
envsubst '${PORT} ${IDENTITY_SERVICE_HOST} ${IDENTITY_SERVICE_PORT} ${IDENTITY_SERVICE_PROTOCOL} ${MEMBER_SERVICE_HOST} ${MEMBER_SERVICE_PORT} ${MEMBER_SERVICE_PROTOCOL} ${SCHEDULE_SERVICE_HOST} ${SCHEDULE_SERVICE_PORT} ${SCHEDULE_SERVICE_PROTOCOL} ${BILLING_SERVICE_HOST} ${BILLING_SERVICE_PORT} ${BILLING_SERVICE_PROTOCOL}' < /etc/nginx/templates/nginx.conf.template > /etc/nginx/nginx.conf

# Also write config to a file for debugging
cat > /tmp/gateway-config.json <<EOF
{
  "port": "$PORT",
  "identity_service": {
    "host": "$IDENTITY_SERVICE_HOST",
    "port": "$IDENTITY_SERVICE_PORT",
    "protocol": "$IDENTITY_SERVICE_PROTOCOL",
    "url": "${IDENTITY_SERVICE_URL:-not set}"
  },
  "member_service": {
    "host": "$MEMBER_SERVICE_HOST",
    "port": "$MEMBER_SERVICE_PORT",
    "protocol": "$MEMBER_SERVICE_PROTOCOL",
    "url": "${MEMBER_SERVICE_URL:-not set}"
  },
  "schedule_service": {
    "host": "$SCHEDULE_SERVICE_HOST",
    "port": "$SCHEDULE_SERVICE_PORT",
    "protocol": "$SCHEDULE_SERVICE_PROTOCOL",
    "url": "${SCHEDULE_SERVICE_URL:-not set}"
  },
  "billing_service": {
    "host": "$BILLING_SERVICE_HOST",
    "port": "$BILLING_SERVICE_PORT",
    "protocol": "$BILLING_SERVICE_PROTOCOL",
    "url": "${BILLING_SERVICE_URL:-not set}"
  }
}
EOF
echo "Configuration saved to /tmp/gateway-config.json" >&2

# Verify nginx.conf was generated
if [ ! -f /etc/nginx/nginx.conf ]; then
    echo "ERROR: Failed to generate nginx.conf!" >&2
    exit 1
fi

# Show generated nginx.conf (first 50 lines for debugging)
echo "=== Generated nginx.conf (first 50 lines) ===" >&2
head -n 50 /etc/nginx/nginx.conf >&2
echo "==============================================" >&2

# Test nginx configuration
echo "Testing nginx configuration..." >&2
nginx -t 2>&1

if [ $? -ne 0 ]; then
    echo "ERROR: nginx configuration test failed!" >&2
    exit 1
fi

# Start nginx
echo "Starting nginx..." >&2
exec nginx -g 'daemon off;'
