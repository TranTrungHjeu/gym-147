# ================================
# Identity Service Dockerfile
# Node.js + Prisma Production
# ================================

FROM node:20-alpine

WORKDIR /app

# Install all deps (build tools + canvas runtime)
RUN apk add --no-cache python3 make g++ cairo-dev jpeg-dev pango-dev giflib-dev librsvg-dev openssl openssl-dev

# Copy package files
COPY services/identity-service/package*.json ./

# Install dependencies (including optional for canvas)
RUN npm install --ignore-scripts --include=optional --foreground-scripts --no-audit --no-fund

# Copy monorepo source code (services + packages)
COPY services/ ./services/
COPY packages/ ./packages/

# Copy Prisma schema and migrations
COPY services/identity-service/prisma/ ./prisma/

# Create scoped packages directory and symlink shared packages
RUN mkdir -p /app/node_modules/@gym-147 && \
    ln -sf /app/packages/shared-middleware /app/node_modules/@gym-147/shared-middleware && \
    ln -sf /app/packages/shared-types /app/node_modules/@gym-147/shared-types && \
    ln -sf /app/packages/shared-config /app/node_modules/@gym-147/shared-config && \
    ln -sf /app/packages/shared-utils /app/node_modules/@gym-147/shared-utils && \
    ln -sf /app/services/shared /app/node_modules/@gym-147/shared

# Generate Prisma client
RUN cd /app/services/identity-service && npx prisma generate

# Install runtime libs (curl for healthcheck)
RUN apk add --no-cache curl

# Create models directory for face recognition
RUN mkdir -p /app/models && chown -R nodejs:nodejs /app 2>/dev/null || true

# Create non-root user
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001

RUN chown -R nodejs:nodejs /app

USER nodejs

# Expose port
EXPOSE 3001

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:3001/health || exit 1

# Start command
CMD ["sh", "-c", "npx prisma migrate deploy && exec node /app/services/identity-service/src/main.js"]
