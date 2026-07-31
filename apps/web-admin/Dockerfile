# ================================
# Web Admin Dockerfile
# React + Vite Production Build
# ================================

# Build stage
FROM node:20-alpine AS builder

WORKDIR /app

# Copy monorepo package files first to leverage Docker layer cache
COPY package*.json ./
COPY apps/web-admin/package*.json ./apps/web-admin/
COPY packages/shared-config/package*.json ./packages/shared-config/

# Install all workspace dependencies (monorepo install)
RUN npm install --ignore-scripts --workspaces --include-workspace-root=false --no-audit --no-fund

# Copy source code
COPY apps/web-admin/ ./apps/web-admin/
COPY packages/shared-config/ ./packages/shared-config/

# Symlink shared-config into web-admin's node_modules so Vite can resolve it
RUN mkdir -p /app/apps/web-admin/node_modules/@gym-147 && \
    ln -sfn /app/packages/shared-config /app/apps/web-admin/node_modules/@gym-147/shared-config

# Build the app
WORKDIR /app/apps/web-admin
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
