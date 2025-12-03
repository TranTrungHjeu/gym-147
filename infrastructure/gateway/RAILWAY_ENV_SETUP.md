# Hướng dẫn Set Environment Variables trong Railway

## Bước 1: Lấy Service URLs

1. Vào Railway dashboard
2. Click vào từng service bạn muốn connect:

   - Identity Service
   - Member Service
   - Schedule Service
   - Billing Service

3. Trong mỗi service, tìm phần **"Networking"** hoặc **"Settings"**
4. Copy **Public Domain** hoặc **Private Network URL**

Ví dụ:

- Identity: `https://identity-service-production-xxxx.up.railway.app`
- Member: `https://member-service-production-xxxx.up.railway.app`
- Schedule: `https://schedule-service-production-xxxx.up.railway.app`
- Billing: `https://billing-service-production-6ef9.up.railway.app`

## Bước 2: Set Environment Variables cho Gateway

1. Vào Gateway service trong Railway dashboard
2. Click vào tab **"Variables"**
3. Thêm các biến sau:

### Cách 1: Sử dụng Service URLs (Đơn giản nhất)

```
IDENTITY_SERVICE_URL=https://identity-service-production-xxxx.up.railway.app
MEMBER_SERVICE_URL=https://member-service-production-xxxx.up.railway.app
SCHEDULE_SERVICE_URL=https://schedule-service-production-xxxx.up.railway.app
BILLING_SERVICE_URL=https://billing-service-production-6ef9.up.railway.app
```

**Lưu ý:** Gateway sẽ tự động extract hostname và sử dụng port 80 cho HTTP/HTTPS URLs.

### Cách 2: Sử dụng Host và Port riêng biệt

Nếu bạn muốn chỉ định cụ thể:

```
IDENTITY_SERVICE_HOST=identity-service-production-xxxx.up.railway.app
IDENTITY_SERVICE_PORT=80
MEMBER_SERVICE_HOST=member-service-production-xxxx.up.railway.app
MEMBER_SERVICE_PORT=80
SCHEDULE_SERVICE_HOST=schedule-service-production-xxxx.up.railway.app
SCHEDULE_SERVICE_PORT=80
BILLING_SERVICE_HOST=billing-service-production-6ef9.up.railway.app
BILLING_SERVICE_PORT=80
```

## Bước 3: Verify và Deploy

1. Sau khi set xong tất cả variables, click **"Save"**
2. Railway sẽ tự động redeploy service
3. Kiểm tra logs để verify:
   - Vào **Deployments** → Click vào deployment mới nhất → **Logs**
   - Tìm dòng: `=== Gateway Configuration ===`
   - Verify các service URLs đã được set đúng

## Ví dụ Log Output mong đợi:

```
=== Gateway Configuration ===
PORT: 80
IDENTITY_SERVICE: identity-service-production-xxxx.up.railway.app:80
MEMBER_SERVICE: member-service-production-xxxx.up.railway.app:80
SCHEDULE_SERVICE: schedule-service-production-xxxx.up.railway.app:80
BILLING_SERVICE: billing-service-production-6ef9.up.railway.app:80
=============================
Generating nginx.conf from template...
Testing nginx configuration...
nginx: configuration file /etc/nginx/nginx.conf test is successful
Starting nginx...
```

## Test sau khi deploy:

1. Health check: `https://your-gateway.up.railway.app/health`

   - Should return: `healthy`

2. Test proxy: `https://your-gateway.up.railway.app/billing/plans/active`
   - Should return JSON data từ billing service

## Troubleshooting

Nếu gặp vấn đề, xem file `TROUBLESHOOTING.md` để biết cách debug.
