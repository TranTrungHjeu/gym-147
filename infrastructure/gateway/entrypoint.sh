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
    
    # Check if URL contains protocol to determine default port
    local is_https=false
    if echo "$original_url" | grep -q '^https://'; then
        is_https=true
    fi
    
    # Remove protocol
    url=${url#http://}
    url=${url#https://}
    
    # Extract port
    if echo "$url" | grep -q ':'; then
        echo "$url" | cut -d: -f2
    else
        # No port specified - use default based on protocol
        # For Railway, public URLs are usually HTTPS (443) or HTTP (80)
        # For private networking, use the service's internal port
        if [ "$is_https" = true ]; then
            # HTTPS URL without port - Railway uses 443, but we'll use 80 for internal proxy
            echo "80"
        else
            # HTTP URL without port - use 80
            echo "80"
        fi
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
    BILLING_SERVICE_PORT=$(extract_port "$BILLING_SERVICE_URL" "3004")
fi
BILLING_SERVICE_PORT=${BILLING_SERVICE_PORT:-3004}

# Default PORT to 80 if not set (Railway provides this automatically)
export PORT=${PORT:-80}

# Export variables for envsubst
export IDENTITY_SERVICE_HOST
export IDENTITY_SERVICE_PORT
export MEMBER_SERVICE_HOST
export MEMBER_SERVICE_PORT
export SCHEDULE_SERVICE_HOST
export SCHEDULE_SERVICE_PORT
export BILLING_SERVICE_HOST
export BILLING_SERVICE_PORT

# Log configuration
echo "=== Gateway Configuration ==="
echo "PORT: $PORT"
echo "IDENTITY_SERVICE: ${IDENTITY_SERVICE_HOST}:${IDENTITY_SERVICE_PORT}"
echo "MEMBER_SERVICE: ${MEMBER_SERVICE_HOST}:${MEMBER_SERVICE_PORT}"
echo "SCHEDULE_SERVICE: ${SCHEDULE_SERVICE_HOST}:${SCHEDULE_SERVICE_PORT}"
echo "BILLING_SERVICE: ${BILLING_SERVICE_HOST}:${BILLING_SERVICE_PORT}"
echo "============================="

# Generate nginx.conf from template
echo "Generating nginx.conf from template..."
envsubst '${PORT} ${IDENTITY_SERVICE_HOST} ${IDENTITY_SERVICE_PORT} ${MEMBER_SERVICE_HOST} ${MEMBER_SERVICE_PORT} ${SCHEDULE_SERVICE_HOST} ${SCHEDULE_SERVICE_PORT} ${BILLING_SERVICE_HOST} ${BILLING_SERVICE_PORT}' < /etc/nginx/templates/nginx.conf.template > /etc/nginx/nginx.conf

# Verify nginx.conf was generated
if [ ! -f /etc/nginx/nginx.conf ]; then
    echo "ERROR: Failed to generate nginx.conf!" >&2
    exit 1
fi

# Show generated nginx.conf (first 50 lines for debugging)
echo "=== Generated nginx.conf (first 50 lines) ==="
head -n 50 /etc/nginx/nginx.conf
echo "=============================================="

# Test nginx configuration
echo "Testing nginx configuration..."
nginx -t

if [ $? -ne 0 ]; then
    echo "ERROR: nginx configuration test failed!" >&2
    exit 1
fi

# Start nginx
echo "Starting nginx..."
exec nginx -g 'daemon off;'
