# ================================
# VPS Deployment Guide
# GYM-147 Production
# ================================

## Mục lục
1. [Yêu cầu hệ thống](#1-yêu-cầu-hệ-thống)
2. [Chuẩn bị VPS](#2-chuẩn-bị-vps)
3. [Cấu hình GitHub Secrets](#3-cấu-hình-github-secrets)
4. [Deploy thủ công](#4-deploy-thủ-công)
5. [Deploy tự động (CI/CD)](#5-deploy-tự-động-cicd)
6. [SSL/HTTPS](#6-sslhttps)
7. [Monitor & Logs](#7-monitor--logs)
8. [Troubleshooting](#8-troubleshooting)

---

## 1. Yêu cầu hệ thống

### VPS Specifications (Khuyến nghị)
| Resource | Minimum | Recommended |
|----------|---------|-------------|
| CPU | 2 cores | 4 cores |
| RAM | 4 GB | 8 GB |
| Storage | 40 GB SSD | 80 GB SSD |
| OS | Ubuntu 22.04 LTS | Ubuntu 22.04 LTS |

### Software cần thiết
- Ubuntu 22.04 LTS
- Docker & Docker Compose
- Git
- Domain name (tùy chọn)

---

## 2. Chuẩn bị VPS

### Bước 2.1: SSH vào VPS
```bash
ssh root@your-vps-ip
```

### Bước 2.2: Chạy script setup server
```bash
# Tạo thư mục và copy script
mkdir -p /opt/gym-147
cd /opt/gym-147

# Copy deploy script từ repo
# Hoặc tạo mới
cat > /opt/gym-147/setup-server.sh << 'EOF'
#!/bin/bash
# [Nội dung từ scripts/server-setup.sh]
EOF

chmod +x /opt/gym-147/setup-server.sh
bash /opt/gym-147/setup-server.sh
```

### Bước 2.3: Tạo SSH Key cho GitHub Actions
```bash
# Tạo SSH key không có passphrase
ssh-keygen -t ed25519 -C "gym147-deploy" -f /root/.ssh/gym147_deploy

# Hiển thị public key (để thêm vào authorized_keys)
cat /root/.ssh/gym147_deploy.pub >> /root/.ssh/authorized_keys

# Hiển thị private key (để thêm vào GitHub Secrets)
cat /root/.ssh/gym147_deploy
```

---

## 3. Cấu hình GitHub Secrets

### Bước 3.1: Truy cập GitHub Repository Settings
1. Mở repo GitHub: `https://github.com/TranTrungHieu/gym-147`
2. Settings > Secrets and variables > Actions

### Bước 3.2: Thêm Secrets cần thiết

| Secret Name | Mô tả | Ví dụ |
|-------------|--------|-------|
| `VPS_HOST` | IP VPS | `123.456.789.10` |
| `VPS_USER` | Username SSH | `root` |
| `VPS_SSH_KEY` | Private SSH key | (nội dung key) |
| `VPS_SSH_PORT` | Port SSH | `22` |
| `VPS_DEPLOY_PATH` | Thư mục deploy | `/opt/gym-147` |

### Bước 3.3: Thêm Repository Variables

| Variable Name | Value |
|--------------|-------|
| `DISCORD_WEBHOOK_ID` | Webhook ID (nếu dùng Discord notification) |
| `DISCORD_WEBHOOK_TOKEN` | Webhook Token |

---

## 4. Deploy thủ công

### Bước 4.1: Clone repo lên VPS
```bash
cd /opt/gym-147
git clone https://github.com/TranTrungHieu/gym-147.git .
```

### Bước 4.2: Tạo file .env
```bash
cd /opt/gym-147
cp infrastructure/docker/.env.example .env
nano .env
```

**Các biến quan trọng cần thay đổi:**
```env
# BẮT BUỘC - Security
JWT_SECRET=your-32-char-minimum-secret-key-here
POSTGRES_PASSWORD=change_this_secure_password
REDIS_PASSWORD=change_this_redis_password

# Tùy chọn - Payment
VNPAY_TMN_CODE=your_vnpay_code
VNPAY_HASH_SECRET=your_vnpay_secret
```

### Bước 4.3: Tạo thư mục data
```bash
mkdir -p /opt/gym-147/data/postgres
mkdir -p /opt/gym-147/data/redis
mkdir -p /var/www/gym-147/static
mkdir -p /var/log/gym-147
```

### Bước 4.4: Build và start services
```bash
cd /opt/gym-147

# Build images
docker compose -f docker-compose.prod.yml build

# Start services
docker compose -f docker-compose.prod.yml up -d

# Xem logs
docker compose -f docker-compose.prod.yml logs -f

# Kiểm tra status
docker compose -f docker-compose.prod.yml ps
```

### Bước 4.5: Chạy database migrations
```bash
docker compose -f docker-compose.prod.yml exec identity-service npx prisma migrate deploy
docker compose -f docker-compose.prod.yml exec member-service npx prisma migrate deploy
docker compose -f docker-compose.prod.yml exec schedule-service npx prisma migrate deploy
docker compose -f docker-compose.prod.yml exec billing-service npx prisma migrate deploy
```

---

## 5. Deploy tự động (CI/CD)

### Flow CI/CD Pipeline

```
Push Code → GitHub Actions
      ↓
   [1] Lint & Test
      ↓
   [2] Build Backend (4 services)
      ↓
   [3] Build Frontend (web-admin)
      ↓
   [4] Build Gateway
      ↓
   [5] Deploy to VPS (auto on main/develop)
      ↓
   [6] Notify (Discord - optional)
```

### Trigger
- **Branch `main`**: Deploy production
- **Branch `develop`**: Deploy staging
- **PR**: Chạy test, security scan, build verification

### Kiểm tra CI/CD status
1. GitHub repo > Actions tab
2. Xem workflow runs
3. Click vào workflow để xem chi tiết từng job

---

## 6. SSL/HTTPS

### Cách 1: Cloudflare (Khuyến nghị - Miễn phí)
1. Đăng ký Cloudflare
2. Thêm domain của bạn
3. Đổi nameservers theo hướng dẫn
4. Enable proxy cho subdomain:
   - `api.your-domain.com`
   - `admin.your-domain.com`

### Cách 2: Let's Encrypt (Certbot)
```bash
# Cài đặt certbot
apt install certbot python3-certbot-nginx

# Lấy certificate
certbot --nginx -d api.your-domain.com -d admin.your-domain.com

# Auto-renewal (đã được cấu hình tự động)
systemctl status certbot.timer
```

### Cấu hình Nginx cho HTTPS
```nginx
# Thêm vào /etc/nginx/sites-available/default
server {
    listen 80;
    server_name api.your-domain.com;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name api.your-domain.com;
    
    ssl_certificate /etc/letsencrypt/live/api.your-domain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/api.your-domain.com/privkey.pem;
    
    # ... rest of config
}
```

---

## 7. Monitor & Logs

### Xem logs container
```bash
# Tất cả logs
docker compose -f docker-compose.prod.yml logs -f

# Logs một service cụ thể
docker compose -f docker-compose.prod.yml logs -f identity-service

# Logs với timestamp
docker compose -f docker-compose.prod.yml logs -f -t
```

### Health check
```bash
# Script health check
bash scripts/health-check.sh

# Hoặc kiểm tra từng service
curl http://localhost:3001/health  # Identity
curl http://localhost:3002/health  # Member
curl http://localhost:3003/health  # Schedule
curl http://localhost:3004/health  # Billing
curl http://localhost/health       # Gateway
```

### Backup
```bash
# Chạy backup
bash scripts/backup.sh

# Backup files nằm ở
ls -la /opt/backups/gym-147/
```

### Portainer (Web UI cho Docker)
- URL: `https://your-vps-ip:9443`
- Đăng nhập lần đầu: Tạo admin user

---

## 8. Troubleshooting

### Container không start
```bash
# Xem logs
docker compose -f docker-compose.prod.yml logs [service-name]

# Restart service
docker compose -f docker-compose.prod.yml restart [service-name]
```

### Database connection failed
```bash
# Kiểm tra postgres
docker compose -f docker-compose.prod.yml exec postgres psql -U gym

# Kiểm tra connection string trong .env
# DATABASE_URL phải đúng format
```

### Port đã được sử dụng
```bash
# Tìm process đang dùng port
lsof -i :80
lsof -i :443
lsof -i :3000

# Kill process
kill -9 [PID]
```

### Không truy cập được từ bên ngoài
```bash
# Kiểm tra firewall
ufw status

# Mở port nếu cần
ufw allow 80/tcp
ufw allow 443/tcp
```

### Rebuild không tải được image mới
```bash
# Xóa image cũ
docker compose -f docker-compose.prod.yml down --rmi local

# Pull lại
docker compose -f docker-compose.prod.yml pull

# Build lại từ đầu
docker compose -f docker-compose.prod.yml build --no-cache
docker compose -f docker-compose.prod.yml up -d
```

### Reset hoàn toàn
```bash
# STOP all services
docker compose -f docker-compose.prod.yml down

# XÓA all data (CẨN THẬN!)
docker compose -f docker-compose.prod.yml down -v
rm -rf /opt/gym-147/data/*

# Restart fresh
docker compose -f docker-compose.prod.yml up -d
```

---

## Lệnh hữu ích

```bash
# Restart tất cả
docker compose -f docker-compose.prod.yml restart

# Stop tất cả
docker compose -f docker-compose.prod.yml down

# Rebuild
docker compose -f docker-compose.prod.yml up -d --build

# Xem resource usage
docker stats

# Shell vào container
docker exec -it gym147_identity sh
```

---

## Liên hệ & Hỗ trợ

- **GitHub Issues**: [Link repo](https://github.com/TranTrungHieu/gym-147/issues)
- **Email**: tran.trung.hieu@example.com
