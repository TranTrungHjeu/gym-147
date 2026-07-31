# ================================
# Web Admin Dockerfile
# React + Vite Production Build
# ================================

# Build stage
FROM node:20-alpine AS builder

WORKDIR /app

# Install dependencies
COPY apps/web-admin/package*.json ./
RUN npm install --ignore-scripts

# Copy source code
COPY apps/web-admin/ ./

# Copy shared packages
COPY packages/shared-config/ ./node_modules/@gym-147/shared-config/

# Build the app
RUN npm run build

# Production stage - Nginx
FROM nginx:alpine AS production

# Install utilities
RUN apk add --no-cache curl

# Copy nginx config
COPY apps/web-admin/nginx.conf /etc/nginx/conf.d/default.conf

# Copy built assets from builder
COPY --from=builder /app/dist /usr/share/nginx/html

# Create logs directory
RUN mkdir -p /var/log/nginx && \
    chown -R nginx:nginx /var/log/nginx && \
    chown -R nginx:nginx /usr/share/nginx/html

EXPOSE 80

HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD curl -f http://localhost/health || exit 1

CMD ["nginx", "-g", "daemon off;"]
