# Gateway Setup cho Railway

## Tổng quan

Gateway service sử dụng Nginx làm reverse proxy để route requests đến các backend services và xử lý CORS headers.

## Cấu trúc Files

- `Dockerfile.railway`: Dockerfile tối ưu cho Railway deployment
- `entrypoint.railway.sh`: Script xử lý environment variables và generate nginx.conf
- `nginx.conf.template`: Template file cho nginx configuration với các biến môi trường

## Cấu hình Railway

### 1. Root Directory
Set **Root Directory** trong Railway project settings:
```
infrastructure/gateway
```

### 2. Dockerfile Path
Set **Dockerfile Path** (nếu Railway không tự detect):
```
Dockerfile.railway
```

### 3. Environment Variables

Cần set các biến môi trường sau trong Railway:

#### Port (tự động)
- `PORT`: Railway tự động set, không cần set thủ công

#### Service URLs
- `IDENTITY_SERVICE_URL`: URL của identity service (ví dụ: `http://identity-service:3001`)
- `MEMBER_SERVICE_URL`: URL của member service (ví dụ: `http://member-service:3002`)
- `SCHEDULE_SERVICE_URL`: URL của schedule service (ví dụ: `http://schedule-service:3003`)
- `BILLING_SERVICE_URL`: URL của billing service (ví dụ: `http://billing-service:3004`)

**Lưu ý**: 
- Có thể dùng Railway internal service URLs (ví dụ: `http://identity-service.internal:3001`)
- Hoặc dùng public URLs nếu services được expose
- Script sẽ tự động extract hostname:port từ full URL

## Cách hoạt động

1. **Build time**: Dockerfile copy template và entrypoint script
2. **Runtime**: 
   - Nginx default entrypoint chạy scripts trong `/docker-entrypoint.d/`
   - Script `00-process-template.sh` chạy đầu tiên:
     - Đọc `PORT` từ Railway và set thành `NGINX_PORT`
     - Extract hostname:port từ service URLs
     - Generate `nginx.conf` từ template bằng `envsubst`
     - Xóa template file để tránh xử lý lại
   - Nginx start với config đã được generate

## Features

- ✅ Dynamic port từ Railway PORT env var
- ✅ CORS headers cho tất cả responses
- ✅ Cache-Control headers để disable caching trên Railway Edge
- ✅ Vary: Origin header để Railway Edge không cache sai
- ✅ Rate limiting
- ✅ Health check endpoint tại `/health`
- ✅ Error handling với CORS headers

## Health Check

Health check endpoint: `GET /health`

Returns: `200 OK` với body `healthy\n`

## Troubleshooting

### CORS headers không được forward
- Kiểm tra Railway Edge có đang cache không
- Đảm bảo Cache-Control headers được set (đã có trong config)
- Kiểm tra Vary: Origin header (đã có trong config)

### Port không đúng
- Kiểm tra `PORT` env var trong Railway
- Kiểm tra logs để xem `NGINX_PORT` được set đúng chưa
- Xem logs: `[00-process-template.sh] NGINX_PORT=...`

### Service URLs không đúng
- Kiểm tra service URLs trong Railway environment variables
- Kiểm tra logs để xem extracted URLs: `[00-process-template.sh] IDENTITY_SERVICE_URL=...`
- Đảm bảo format đúng: `http://service-name:port` hoặc `http://service-name.internal:port`

### Script không chạy
- Kiểm tra file có được copy đúng không: `/docker-entrypoint.d/00-process-template.sh`
- Kiểm tra quyền thực thi: `chmod +x`
- Xem logs để tìm `[00-process-template.sh] Starting template processing...`
