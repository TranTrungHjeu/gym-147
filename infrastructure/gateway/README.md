# Gateway Service - Railway Deployment

Gateway service sử dụng Nginx làm reverse proxy cho các microservices.

## Railway Configuration

### Root Directory

**QUAN TRỌNG:** Trong Railway dashboard, bạn **PHẢI** set **Root Directory** là: `infrastructure/gateway`

Nếu không set Root Directory, Railway sẽ tìm Dockerfile ở root của repo và sẽ báo lỗi "Dockerfile does not exist".

**Cách set Root Directory trong Railway:**

1. Vào service settings trong Railway dashboard
2. Tìm phần "Root Directory" hoặc "Source"
3. Nhập: `infrastructure/gateway`
4. Save và redeploy

### Environment Variables

Gateway cần các environment variables sau để kết nối với các services:

#### Option 1: Sử dụng Service URLs (Recommended)

Railway tự động tạo các service URLs. Bạn có thể reference chúng trong Railway dashboard:

**Lưu ý quan trọng:** Railway URLs thường không có port trong URL (ví dụ: `https://billing-service-production-6ef9.up.railway.app`). Gateway sẽ tự động detect và sử dụng port 80 cho HTTP hoặc 443 cho HTTPS.

- `IDENTITY_SERVICE_URL` - URL của identity service (ví dụ: `https://identity-service-production-xxxx.up.railway.app`)
- `MEMBER_SERVICE_URL` - URL của member service (ví dụ: `https://member-service-production-xxxx.up.railway.app`)
- `SCHEDULE_SERVICE_URL` - URL của schedule service (ví dụ: `https://schedule-service-production-xxxx.up.railway.app`)
- `BILLING_SERVICE_URL` - URL của billing service (ví dụ: `https://billing-service-production-6ef9.up.railway.app`)

**Cách lấy Service URLs trong Railway:**

1. Vào Railway dashboard
2. Click vào từng service (identity, member, schedule, billing)
3. Copy **Public Domain** hoặc **Private Network URL**
4. Paste vào environment variables của gateway service

#### Option 2: Sử dụng Host và Port riêng biệt

Nếu bạn muốn chỉ định host và port riêng:

- `IDENTITY_SERVICE_HOST` - Hostname của identity service (default: `identity`)
- `IDENTITY_SERVICE_PORT` - Port của identity service (default: `3001`)
- `MEMBER_SERVICE_HOST` - Hostname của member service (default: `member`)
- `MEMBER_SERVICE_PORT` - Port của member service (default: `3002`)
- `SCHEDULE_SERVICE_HOST` - Hostname của schedule service (default: `schedule`)
- `SCHEDULE_SERVICE_PORT` - Port của schedule service (default: `3003`)
- `BILLING_SERVICE_HOST` - Hostname của billing service (default: `billing`)
- `BILLING_SERVICE_PORT` - Port của billing service (default: `3004`)

**Lưu ý:** Railway tự động set biến `PORT` cho gateway service.

### Railway Service Discovery

Nếu các services được deploy trên cùng một Railway project, bạn có thể sử dụng Railway's private networking:

1. Trong Railway dashboard, tạo các services cho identity, member, schedule, billing
2. Railway sẽ tự động tạo private network URLs
3. Reference các URLs này trong gateway service environment variables

### Cách setup trên Railway

1. Tạo một service mới trong Railway project
2. Connect với GitHub repository
3. Set **Root Directory** thành `infrastructure/gateway`
4. Railway sẽ tự động detect `railway.json` và `Dockerfile`
5. Thêm các environment variables như mô tả ở trên
6. Deploy!

### Health Check

Gateway có health check endpoint tại: `/health`

### Static Files

Gateway có thể serve static files từ `/usr/share/nginx/html` (cần mount volume hoặc copy files vào image).
