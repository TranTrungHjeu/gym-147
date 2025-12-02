FROM node:20
WORKDIR /app

# Build context should be from project root
# When building: docker build -f services/member-service/Dockerfile .

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
WORKDIR /app/services/member-service

# Copy service package files
COPY services/member-service/package.json ./
RUN npm install

# Copy Prisma schema
COPY services/member-service/prisma ./prisma

# Generate Prisma client
RUN npx prisma generate

# Copy source code
COPY services/member-service/src ./src

# Remove dev dependencies for smaller image
RUN npm prune --production

EXPOSE 3002
CMD ["node", "src/main.js"]
