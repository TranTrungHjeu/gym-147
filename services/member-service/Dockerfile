# ================================
# Member Service Dockerfile
# Node.js + Prisma Production
# ================================

FROM node:20-alpine

WORKDIR /app

# Install all deps in a single layer (build tools + sharp native libs + curl + libvips runtime)
RUN apk add --no-cache \
        python3 \
        make \
        g++ \
        cairo-dev \
        jpeg-dev \
        pango-dev \
        giflib-dev \
        librsvg-dev \
        openssl \
        openssl-dev \
        curl

# Copy package files
COPY services/member-service/package*.json ./

# Install dependencies
RUN npm install --include=optional --foreground-scripts --no-audit --no-fund

# Force install sharp prebuilt for alpine/musl linux x64 (official @img/sharp-linuxmusl-x64)
RUN npm install --os=linux --libc=musl --cpu=x64 @img/sharp-linuxmusl-x64@0.34.0 sharp@0.34.0 --foreground-scripts --no-save --no-audit --no-fund

# Copy monorepo source code
COPY services/ ./services/
COPY packages/ ./packages/

# Copy Prisma
COPY services/member-service/prisma/ ./prisma/

# Symlink shared packages
RUN mkdir -p /app/node_modules/@gym-147 && \
    ln -sf /app/packages/shared-middleware /app/node_modules/@gym-147/shared-middleware && \
    ln -sf /app/packages/shared-types /app/node_modules/@gym-147/shared-types && \
    ln -sf /app/packages/shared-config /app/node_modules/@gym-147/shared-config && \
    ln -sf /app/packages/shared-utils /app/node_modules/@gym-147/shared-utils && \
    ln -sf /app/services/shared /app/node_modules/@gym-147/shared

# Generate Prisma client
RUN cd /app/services/member-service && npx prisma generate

# Create non-root user and grant ownership of /app BEFORE switching to it
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001 && \
    mkdir -p /app/uploads && \
    chown -R nodejs:nodejs /app

USER nodejs

EXPOSE 3002

HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:3002/health || exit 1

CMD ["sh", "-c", "npx prisma migrate deploy && exec node /app/services/member-service/src/main.js"]
