FROM node:20
WORKDIR /app

# Build context should be from project root
# When building: docker build -f services/schedule-service/Dockerfile .

# Copy shared packages first (needed by services)
COPY packages ./packages

# Install dependencies for shared packages
WORKDIR /app/packages/shared-config
RUN if [ -f "package.json" ]; then npm install --production; fi

WORKDIR /app/packages/shared-middleware
RUN if [ -f "package.json" ]; then npm install --production; fi

WORKDIR /app/packages/shared-utils
RUN if [ -f "package.json" ]; then npm install --production; fi

WORKDIR /app/packages/shared-types
RUN if [ -f "package.json" ]; then npm install --production; fi

# Back to service directory
WORKDIR /app/services/schedule-service

# Copy service package files
COPY services/schedule-service/package.json ./
RUN npm install

# Copy Prisma schema
COPY services/schedule-service/prisma ./prisma

# Generate Prisma client (will use DATABASE_URL from runtime, not build time)
# Note: DATABASE_URL is not needed for generate, only for migrations
RUN npx prisma generate

# Copy source code
COPY services/schedule-service/src ./src

# Keep prisma in dependencies for runtime migrations
# Don't prune prisma as it's needed for migrations
RUN npm prune --production

EXPOSE 3003
CMD ["node", "src/main.js"]
