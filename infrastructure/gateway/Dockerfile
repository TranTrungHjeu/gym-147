# Gateway Dockerfile - Nginx Reverse Proxy
# Build context: repository root (see docker-compose.vps-build.yml)
FROM nginx:alpine

# Install gettext for envsubst
RUN apk add --no-cache gettext

# Remove default nginx config to avoid conflicts
RUN rm -f /etc/nginx/conf.d/default.conf

# Copy gateway runtime files from the repository-root build context
COPY infrastructure/gateway/nginx/nginx.conf.template /etc/nginx/templates/nginx.conf.template
COPY infrastructure/gateway/entrypoint.sh /entrypoint.sh

# Fix line endings (convert CRLF to LF if needed) and ensure executable
# Verify file exists and fix permissions
RUN if [ ! -f /entrypoint.sh ]; then \
        echo "ERROR: entrypoint.sh not found!" && exit 1; \
    fi && \
    sed -i 's/\r$//' /entrypoint.sh && \
    chmod +x /entrypoint.sh && \
    ls -la /entrypoint.sh && \
    head -1 /entrypoint.sh | grep -q "#!/bin/sh" || (echo "ERROR: Invalid shebang" && exit 1)

# Expose port 80
EXPOSE 80

# Use custom entrypoint
ENTRYPOINT ["/entrypoint.sh"]
