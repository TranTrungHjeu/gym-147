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

    # Check if nginx.conf already exists (script may run multiple times)
    if [ -f /etc/nginx/nginx.conf ]; then
        echo "[00-process-template.sh] nginx.conf already exists, skipping template processing..."
        exit 0
    fi

    # Check if template exists (using .tmpl extension to avoid nginx default processing)
    if [ ! -f /etc/nginx/templates/nginx.conf.tmpl ]; then
        echo "[00-process-template.sh] ERROR: Template file not found!"
        exit 1
    fi

    # Substitute environment variables in nginx.conf.tmpl
    # This script runs as part of nginx default entrypoint (in /docker-entrypoint.d/)
    # It processes the template BEFORE nginx default template processor runs
    # Using .tmpl extension so nginx default entrypoint (20-envsubst-on-templates.sh) won't process it
    echo "[00-process-template.sh] Processing nginx.conf.tmpl..."
    envsubst '${NGINX_PORT} ${IDENTITY_SERVICE_URL} ${MEMBER_SERVICE_URL} ${SCHEDULE_SERVICE_URL} ${BILLING_SERVICE_URL}' \
    < /etc/nginx/templates/nginx.conf.tmpl \
    > /etc/nginx/nginx.conf

    # Verify nginx.conf was created successfully
    if [ ! -f /etc/nginx/nginx.conf ]; then
        echo "[00-process-template.sh] ERROR: Failed to create nginx.conf!"
        exit 1
    fi

    # Verify NGINX_PORT was substituted (check for ${NGINX_PORT} pattern)
    if grep -q '\${NGINX_PORT}' /etc/nginx/nginx.conf; then
        echo "[00-process-template.sh] WARNING: NGINX_PORT variable not substituted!"
        echo "[00-process-template.sh] Current NGINX_PORT value: ${NGINX_PORT}"
    fi

    # Remove template file to prevent any accidental processing
    echo "[00-process-template.sh] Removing template file..."
    rm -f /etc/nginx/templates/nginx.conf.tmpl
    
    # Also remove any accidentally created files in conf.d from previous runs
    rm -f /etc/nginx/conf.d/nginx.conf

    echo "[00-process-template.sh] Template processing complete!"
