# ================================
# Identity Service Dockerfile
# Node.js + Prisma Production
# ================================

FROM node:20-alpine

WORKDIR /app

# Install all deps (build tools + canvas runtime)
RUN apk add --no-cache python3 make g++ cairo-dev jpeg-dev pango-dev giflib-dev librsvg-dev

# Copy package files
COPY services/identity-service/package*.json ./

# Install dependencies (including optional for canvas)
RUN npm ci --include=optional --foreground-scripts

# Copy source code
COPY services/identity-service/ ./src/
COPY services/identity-service/prisma/ ./prisma/
COPY packages/shared-middleware/ ./node_modules/@gym-147/shared-middleware/
COPY packages/shared-types/ ./node_modules/@gym-147/shared-types/
COPY packages/shared-config/ ./node_modules/@gym-147/shared-config/
COPY packages/shared-utils/ ./node_modules/@gym-147/shared-utils/

# Generate Prisma client
RUN npx prisma generate

# Install runtime libs (curl for healthcheck)
RUN apk add --no-cache curl

# Create non-root user
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001

# Create models directory for face recognition
RUN mkdir -p /app/models && chown -R nodejs:nodejs /app

# Switch to non-root user
USER nodejs

# Expose port
EXPOSE 3001

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:3001/health || exit 1

# Start command
CMD ["sh", "-c", "npx prisma migrate deploy && node src/main.js"]
