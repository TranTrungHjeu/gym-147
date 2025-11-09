FROM node:20
WORKDIR /app

COPY package.json ./
RUN npm install

# Copy Prisma schema
COPY prisma ./prisma

# Generate Prisma client
RUN npx prisma generate

# Copy source code
COPY src ./src

# Copy .env vào image (optional, có thể dùng env_file trong docker-compose)
# COPY .env ./

# Note: Migration sẽ chạy khi container start nếu cần
# Hoặc chạy thủ công: docker exec identity-service npx prisma migrate deploy

RUN npm prune --production

EXPOSE 3001
CMD ["node", "src/main.js"]