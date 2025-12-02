        #!/bin/sh
        # Entrypoint script for Gateway on Railway - substitutes environment variables in nginx.conf

        set -e

        # Debug: Log that this script is running
        echo "[00-process-template.sh] Starting template processing..."

        # Function to extract hostname:port and protocol from URL
        # Returns: protocol:hostname:port (for nginx variable usage)
        extract_host_port() {
            local url="$1"
            local protocol="http"
            
            # Detect protocol
            if [[ "$url" == https://* ]]; then
                protocol="https"
                url="${url#https://}"
            elif [[ "$url" == http://* ]]; then
                protocol="http"
                url="${url#http://}"
            fi
            
            # Remove trailing slash if present
            url="${url%/}"
            
            # Check if port is already present
            if [[ "$url" == *:* ]]; then
                # Port already present, return protocol:hostname:port
                echo "${protocol}:${url}"
            else
                # No port present, add default port based on protocol
                if [ "$protocol" = "https" ]; then
                    echo "${protocol}:${url}:443"
                else
                    # Default to port 80 for HTTP or if no protocol specified
                    echo "${protocol}:${url}:80"
                fi
            fi
        }
        
        # Function to extract just hostname:port (for upstream server directive)
        extract_host_port_only() {
            local url_with_protocol="$1"
            # Remove protocol prefix
            echo "${url_with_protocol#*:}"
        }

        # Railway provides PORT environment variable - default to 80 if not set
        NGINX_PORT=${PORT:-80}
        export NGINX_PORT

        # Default values if not set
        IDENTITY_SERVICE_URL_INPUT=${IDENTITY_SERVICE_URL:-http://localhost:3001}
        MEMBER_SERVICE_URL_INPUT=${MEMBER_SERVICE_URL:-http://localhost:3002}
        SCHEDULE_SERVICE_URL_INPUT=${SCHEDULE_SERVICE_URL:-http://localhost:3003}
        BILLING_SERVICE_URL_INPUT=${BILLING_SERVICE_URL:-http://localhost:3004}

        # Extract protocol:hostname:port for processing
        IDENTITY_SERVICE_URL_FULL=$(extract_host_port "$IDENTITY_SERVICE_URL_INPUT")
        MEMBER_SERVICE_URL_FULL=$(extract_host_port "$MEMBER_SERVICE_URL_INPUT")
        SCHEDULE_SERVICE_URL_FULL=$(extract_host_port "$SCHEDULE_SERVICE_URL_INPUT")
        BILLING_SERVICE_URL_FULL=$(extract_host_port "$BILLING_SERVICE_URL_INPUT")
        
        # Extract protocol (first part before :)
        IDENTITY_SERVICE_PROTOCOL=$(echo "$IDENTITY_SERVICE_URL_FULL" | cut -d: -f1)
        MEMBER_SERVICE_PROTOCOL=$(echo "$MEMBER_SERVICE_URL_FULL" | cut -d: -f1)
        SCHEDULE_SERVICE_PROTOCOL=$(echo "$SCHEDULE_SERVICE_URL_FULL" | cut -d: -f1)
        BILLING_SERVICE_PROTOCOL=$(echo "$BILLING_SERVICE_URL_FULL" | cut -d: -f1)
        
        # Extract hostname:port (remove protocol prefix)
        IDENTITY_SERVICE_URL=$(extract_host_port_only "$IDENTITY_SERVICE_URL_FULL")
        MEMBER_SERVICE_URL=$(extract_host_port_only "$MEMBER_SERVICE_URL_FULL")
        SCHEDULE_SERVICE_URL=$(extract_host_port_only "$SCHEDULE_SERVICE_URL_FULL")
        BILLING_SERVICE_URL=$(extract_host_port_only "$BILLING_SERVICE_URL_FULL")

        # Export for envsubst
        export IDENTITY_SERVICE_URL
        export MEMBER_SERVICE_URL
        export SCHEDULE_SERVICE_URL
        export BILLING_SERVICE_URL
        export IDENTITY_SERVICE_PROTOCOL
        export MEMBER_SERVICE_PROTOCOL
        export SCHEDULE_SERVICE_PROTOCOL
        export BILLING_SERVICE_PROTOCOL

        # Debug: Show environment variables
        echo "[00-process-template.sh] NGINX_PORT=${NGINX_PORT}"
        echo "[00-process-template.sh] IDENTITY_SERVICE_URL=${IDENTITY_SERVICE_URL} (protocol: ${IDENTITY_SERVICE_PROTOCOL})"
        echo "[00-process-template.sh] MEMBER_SERVICE_URL=${MEMBER_SERVICE_URL} (protocol: ${MEMBER_SERVICE_PROTOCOL})"
        echo "[00-process-template.sh] SCHEDULE_SERVICE_URL=${SCHEDULE_SERVICE_URL} (protocol: ${SCHEDULE_SERVICE_PROTOCOL})"
        echo "[00-process-template.sh] BILLING_SERVICE_URL=${BILLING_SERVICE_URL} (protocol: ${BILLING_SERVICE_PROTOCOL})"

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
        envsubst '${NGINX_PORT} ${IDENTITY_SERVICE_URL} ${MEMBER_SERVICE_URL} ${SCHEDULE_SERVICE_URL} ${BILLING_SERVICE_URL} ${IDENTITY_SERVICE_PROTOCOL} ${MEMBER_SERVICE_PROTOCOL} ${SCHEDULE_SERVICE_PROTOCOL} ${BILLING_SERVICE_PROTOCOL}' \
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
