# ================================
# Billing Service Dockerfile
# Node.js + Prisma Production
# ================================

FROM node:20-alpine AS builder

WORKDIR /app

RUN apk add --no-cache python3 make g++

COPY services/billing-service/package*.json ./

RUN npm ci --only=production

COPY services/billing-service/ ./src/
COPY services/billing-service/prisma/ ./prisma/
COPY packages/shared-middleware/ ./node_modules/@gym-147/shared-middleware/
COPY packages/shared-types/ ./node_modules/@gym-147/shared-types/
COPY packages/shared-config/ ./node_modules/@gym-147/shared-config/
COPY packages/shared-utils/ ./node_modules/@gym-147/shared-utils/

RUN npx prisma generate

FROM node:20-alpine AS production

WORKDIR /app

RUN apk add --no-cache curl

RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001

COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/src ./src

USER nodejs

EXPOSE 3004

HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:3004/health || exit 1

CMD ["sh", "-c", "npx prisma migrate deploy && node src/main.js"]
