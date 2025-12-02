FROM node:20
WORKDIR /app

# Copy package files
COPY package.json ./

# Install dependencies
RUN npm install

# Copy Prisma schema
COPY prisma ./prisma

# Generate Prisma client (will use DATABASE_URL from runtime, not build time)
# Note: DATABASE_URL is not needed for generate, only for migrations
RUN npx prisma generate

# Copy source code
COPY src ./src

# Keep prisma in dependencies for runtime migrations
# Don't prune prisma as it's needed for migrations
RUN npm prune --production

EXPOSE 3003
CMD ["node", "src/main.js"]
