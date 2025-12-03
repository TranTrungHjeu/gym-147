# Gateway Service - Railway Deployment

Gateway service sử dụng Nginx làm reverse proxy cho các microservices.

## Railway Configuration

### Root Directory

Trong Railway, set **Root Directory** là: `infrastructure/gateway`

### Environment Variables

Gateway cần các environment variables sau để kết nối với các services:

#### Option 1: Sử dụng Service URLs (Recommended)

Railway tự động tạo các service URLs. Bạn có thể reference chúng trong Railway dashboard:

- `IDENTITY_SERVICE_URL` - URL của identity service (ví dụ: `http://identity-service.up.railway.app` hoặc private URL)
- `MEMBER_SERVICE_URL` - URL của member service
- `SCHEDULE_SERVICE_URL` - URL của schedule service
- `BILLING_SERVICE_URL` - URL của billing service

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
