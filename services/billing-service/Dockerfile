# ================================
# Billing Service Dockerfile
# Node.js + Prisma Production
# ================================

FROM node:20-alpine

WORKDIR /app

# Install all deps
RUN apk add --no-cache python3 make g++ cairo-dev jpeg-dev pango-dev giflib-dev librsvg-dev openssl openssl-dev

# Copy package files
COPY services/billing-service/package*.json ./

# Install dependencies
RUN npm install --ignore-scripts --include=optional --foreground-scripts --no-audit --no-fund

# Copy monorepo source code
COPY services/ ./services/
COPY packages/ ./packages/

# Copy Prisma
COPY services/billing-service/prisma/ ./prisma/

# Symlink shared packages
RUN mkdir -p /app/node_modules/@gym-147 && \
    ln -sf /app/packages/shared-middleware /app/node_modules/@gym-147/shared-middleware && \
    ln -sf /app/packages/shared-types /app/node_modules/@gym-147/shared-types && \
    ln -sf /app/packages/shared-config /app/node_modules/@gym-147/shared-config && \
    ln -sf /app/packages/shared-utils /app/node_modules/@gym-147/shared-utils && \
    ln -sf /app/services/shared /app/node_modules/@gym-147/shared

# Generate Prisma client
RUN cd /app/services/billing-service && npx prisma generate

# Install runtime libs
RUN apk add --no-cache curl

# Create non-root user
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001

RUN chown -R nodejs:nodejs /app

USER nodejs

EXPOSE 3004

HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:3004/health || exit 1

CMD ["sh", "-c", "npx prisma migrate resolve --applied 20251024190343 2>/dev/null; npx prisma migrate deploy && exec node /app/services/billing-service/src/main.js"]
