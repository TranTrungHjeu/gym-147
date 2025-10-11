FROM node:20
WORKDIR /app

# Copy package files
COPY package.json ./

# Install dependencies
RUN npm install

# Copy Prisma schema
COPY prisma ./prisma

# Generate Prisma client
RUN npx prisma generate

# Copy source code
COPY src ./src

# Remove dev dependencies for smaller image
RUN npm prune --production

EXPOSE 3000
CMD ["node", "src/main.js"]
