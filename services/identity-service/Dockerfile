FROM node:20
WORKDIR /app

COPY package.json ./
RUN npm install

# Copy .env vào image
COPY .env ./

# Copy Prisma schema
COPY prisma ./prisma

# Generate Prisma client
RUN npx prisma generate

# Thêm dòng này để chạy migration database
RUN npx prisma migrate deploy

# Copy source code
COPY src ./src

RUN npm prune --production

EXPOSE 3000
CMD ["node", "src/main.js"]