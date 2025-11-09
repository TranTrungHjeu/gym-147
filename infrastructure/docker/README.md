# 🚀 Hướng dẫn chạy dự án GYM-147 với Docker

## 📋 Yêu cầu

- Docker Desktop đã cài đặt và đang chạy
- Git
- Node.js 20+ (để build web-admin trước khi deploy)

## 🔧 Chuẩn bị

### 1. Tạo file .env cho từng service

#### Identity Service (.env)

```bash
# File: services/identity-service/.env
DATABASE_URL="postgresql://gym:secret@postgres:5432/gym_identity"
JWT_SECRET="your-super-secret-jwt-key-change-in-production"
PORT=3001
NODE_ENV=production
REDIS_URL="redis://redis:6379"
```

#### Member Service (.env)

```bash
# File: services/member-service/.env
DATABASE_URL="postgresql://gym:secret@postgres:5432/gym_member"
PORT=3002
NODE_ENV=production
REDIS_URL="redis://redis:6379"
IDENTITY_SERVICE_URL="http://identity:3001"
OPENROUTER_API_KEY="your-openrouter-api-key"
```

#### Schedule Service (.env)

```bash
# File: services/schedule-service/.env
DATABASE_URL="postgresql://gym:secret@postgres:5432/gym_schedule"
PORT=3003
NODE_ENV=production
REDIS_URL="redis://redis:6379"
IDENTITY_SERVICE_URL="http://identity:3001"
```

#### Billing Service (.env)

```bash
# File: services/billing-service/.env
DATABASE_URL="postgresql://gym:secret@postgres:5432/gym_billing"
PORT=3004
NODE_ENV=production
REDIS_URL="redis://redis:6379"
IDENTITY_SERVICE_URL="http://identity:3001"
```

### 2. Build Web Admin (tùy chọn)

Nếu bạn muốn deploy web admin qua nginx:

```bash
cd apps/web-admin
npm install
npm run build
```

## 🚀 Chạy Docker Compose

### Khởi động tất cả services

```bash
# Di chuyển vào thư mục docker
cd infrastructure/docker

# Build và start tất cả containers
docker-compose up -d --build

# Hoặc không build lại (nếu đã build trước đó)
docker-compose up -d
```

### Xem logs

```bash
# Xem logs tất cả services
docker-compose logs -f

# Xem logs từng service cụ thể
docker-compose logs -f identity
docker-compose logs -f member
docker-compose logs -f schedule
docker-compose logs -f billing
docker-compose logs -f postgres
```

### Kiểm tra trạng thái

```bash
# Xem trạng thái containers
docker-compose ps

# Kiểm tra health của services
docker-compose ps | grep "healthy"
```

## 🗄️ Database Migration & Seed

### Chạy migrations cho từng service

```bash
# Identity Service
docker exec identity-service npx prisma migrate deploy
docker exec identity-service npx prisma db seed

# Member Service
docker exec member-service npx prisma migrate deploy
docker exec member-service npx prisma db seed

# Schedule Service
docker exec schedule-service npx prisma migrate deploy
docker exec schedule-service npx prisma db seed

# Billing Service
docker exec billing-service npx prisma migrate deploy
docker exec billing-service npx prisma db seed
```

### Hoặc chạy tất cả cùng lúc

```bash
# Tạo file script
# File: scripts/run-migrations.sh

#!/bin/bash
services=("identity" "member" "schedule" "billing")

for service in "${services[@]}"; do
  echo "🔄 Running migrations for $service-service..."
  docker exec ${service}-service npx prisma migrate deploy

  echo "🌱 Seeding $service-service..."
  docker exec ${service}-service npx prisma db seed

  echo "✅ $service-service completed!"
  echo ""
done

echo "🎉 All migrations and seeds completed!"
```

```bash
# Chạy script
chmod +x scripts/run-migrations.sh
./scripts/run-migrations.sh
```

## 🔍 Kiểm tra kết nối

### Endpoints

- **API Gateway:** http://localhost:8080
- **Identity Service:** http://localhost:3001
- **Member Service:** http://localhost:3002
- **Schedule Service:** http://localhost:3003
- **Billing Service:** http://localhost:3004
- **PostgreSQL:** localhost:5432
- **Redis:** localhost:6380

### Test API

```bash
# Health check identity service
curl http://localhost:3001/health

# Health check member service
curl http://localhost:3002/health

# Health check schedule service
curl http://localhost:3003/health

# Health check billing service
curl http://localhost:3004/health
```

## 🛑 Dừng và xóa

```bash
# Dừng tất cả containers
docker-compose down

# Dừng và xóa volumes (XÓA DATA!)
docker-compose down -v

# Xóa images
docker-compose down --rmi all
```

## 🔄 Restart service

```bash
# Restart một service cụ thể
docker-compose restart identity
docker-compose restart member
docker-compose restart schedule
docker-compose restart billing

# Restart tất cả
docker-compose restart
```

## 🐛 Troubleshooting

### Lỗi kết nối database

```bash
# Kiểm tra PostgreSQL
docker exec gym-database psql -U gym -c "\l"

# Vào PostgreSQL shell
docker exec -it gym-database psql -U gym -d gym_identity
```

### Lỗi build

```bash
# Clean build
docker-compose down
docker-compose build --no-cache
docker-compose up -d
```

### Xem logs chi tiết

```bash
# Logs với timestamp
docker-compose logs -f -t identity

# Logs 100 dòng cuối
docker-compose logs --tail=100 identity
```

### Reset hoàn toàn

```bash
# Xóa tất cả
docker-compose down -v --rmi all

# Build lại từ đầu
docker-compose up -d --build

# Chạy lại migrations
./scripts/run-migrations.sh
```

## 📊 Database Management

### Kết nối database từ bên ngoài

```bash
# Sử dụng psql
psql -h localhost -p 5432 -U gym -d gym_identity

# Sử dụng GUI tools (DBeaver, pgAdmin, etc.)
Host: localhost
Port: 5432
User: gym
Password: secret
Databases: gym_identity, gym_member, gym_schedule, gym_billing
```

### Backup database

```bash
# Backup tất cả databases
docker exec gym-database pg_dumpall -U gym > backup.sql

# Backup một database cụ thể
docker exec gym-database pg_dump -U gym gym_identity > identity_backup.sql
```

### Restore database

```bash
# Restore từ backup
docker exec -i gym-database psql -U gym < backup.sql
```

## 🎯 Development vs Production

### Development (với hot reload)

Thay đổi CMD trong Dockerfile:

```dockerfile
# Development
CMD ["npm", "run", "dev"]
```

Mount source code:

```yaml
volumes:
  - ../../services/identity-service/src:/app/src
```

### Production (current setup)

```dockerfile
# Production
CMD ["node", "src/main.js"]
```

## ✅ Checklist

- [ ] Docker Desktop đang chạy
- [ ] Tạo file .env cho tất cả services
- [ ] Build web-admin (nếu cần)
- [ ] Chạy `docker-compose up -d --build`
- [ ] Đợi PostgreSQL healthy
- [ ] Chạy migrations
- [ ] Chạy seed data
- [ ] Test endpoints
- [ ] Check logs

## 🎉 Hoàn tất!

Sau khi hoàn thành các bước trên, hệ thống GYM-147 sẽ chạy hoàn chỉnh với:

- ✅ 4 Microservices (Identity, Member, Schedule, Billing)
- ✅ PostgreSQL với 4 databases riêng biệt
- ✅ Redis cache
- ✅ Nginx API Gateway
- ✅ Web Admin (nếu đã build)

Mobile app có thể kết nối đến:

- Development: `http://localhost:3001-3004`
- Production: `http://your-server-ip:8080`
