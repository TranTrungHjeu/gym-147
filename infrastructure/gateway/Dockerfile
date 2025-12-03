# Gateway Dockerfile - Nginx Reverse Proxy
# Build context: infrastructure/gateway (Railway Root Directory should be set to this)
FROM nginx:alpine

# Install gettext for envsubst
RUN apk add --no-cache gettext

# Remove default nginx config to avoid conflicts
RUN rm -f /etc/nginx/conf.d/default.conf

# Copy nginx configuration template (relative path - assuming Root Directory is infrastructure/gateway)
COPY nginx/nginx.conf.template /etc/nginx/templates/nginx.conf.template

# Copy entrypoint script (relative path)
COPY entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh

# Expose port 80
EXPOSE 80

# Use custom entrypoint
ENTRYPOINT ["/entrypoint.sh"]
