# ================================
# Member Service Dockerfile
# Node.js + Prisma Production
# ================================

FROM node:20-alpine

WORKDIR /app

# Install build deps
RUN apk add --no-cache python3 make g++ cairo-dev jpeg-dev pango-dev giflib-dev librsvg-dev

# Copy package files
COPY services/member-service/package*.json ./

# Install dependencies (including optional for canvas)
RUN npm ci --include=optional --foreground-scripts

# Copy source code
COPY services/member-service/ ./src/
COPY services/member-service/prisma/ ./prisma/
COPY packages/shared-middleware/ ./node_modules/@gym-147/shared-middleware/
COPY packages/shared-types/ ./node_modules/@gym-147/shared-types/
COPY packages/shared-config/ ./node_modules/@gym-147/shared-config/
COPY packages/shared-utils/ ./node_modules/@gym-147/shared-utils/

# Generate Prisma client
RUN npx prisma generate

# Install runtime libs
RUN apk add --no-cache curl

# Create non-root user
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001

RUN mkdir -p /app/uploads && chown -R nodejs:nodejs /app

USER nodejs

EXPOSE 3002

HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:3002/health || exit 1

CMD ["sh", "-c", "npx prisma migrate deploy && node src/main.js"]
