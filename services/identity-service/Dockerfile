FROM node:20
WORKDIR /app

# Build context should be from project root
# When building: docker build -f services/identity-service/Dockerfile .

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
WORKDIR /app/services/identity-service

# Copy service package files
COPY services/identity-service/package.json ./
RUN npm install

# Copy Prisma schema
COPY services/identity-service/prisma ./prisma

# Generate Prisma client
RUN npx prisma generate

# Copy source code
COPY services/identity-service/src ./src

# Copy .env vào image (optional, có thể dùng env_file trong docker-compose)
# COPY services/identity-service/.env ./

# Note: Migration sẽ chạy khi container start nếu cần
# Hoặc chạy thủ công: docker exec identity-service npx prisma migrate deploy

RUN npm prune --production

EXPOSE 3001
CMD ["node", "src/main.js"]