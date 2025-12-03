# Quick Fix: Billing Service Port 3004

## Vấn đề

Billing service đang chạy trên port **3004**, nhưng gateway có thể đang cố kết nối đến port 80.

## Giải pháp

### Cách 1: Set Port riêng biệt (Recommended)

Vào Railway dashboard → Gateway service → Variables và thêm:

```
BILLING_SERVICE_PORT=3004
```

Nếu bạn đã có `BILLING_SERVICE_URL`, vẫn cần thêm port:

```
BILLING_SERVICE_URL=https://billing-service-production-6ef9.up.railway.app
BILLING_SERVICE_PORT=3004
```

### Cách 2: Set Host và Port riêng biệt

```
BILLING_SERVICE_HOST=billing-service-production-6ef9.up.railway.app
BILLING_SERVICE_PORT=3004
```

### Cách 3: Sử dụng URL với port (nếu Railway hỗ trợ)

Nếu Railway cho phép, bạn có thể set URL với port:

```
BILLING_SERVICE_URL=https://billing-service-production-6ef9.up.railway.app:3004
```

**Lưu ý:** Railway public URLs thường không có port trong URL, nên cách tốt nhất là set `BILLING_SERVICE_PORT=3004` riêng biệt.

## Verify sau khi set

1. Redeploy gateway service
2. Kiểm tra debug endpoint:

   ```
   https://nginx-production-66f6.up.railway.app/debug
   ```

   Tìm `"billing_service"` và verify port là `3004`

3. Test billing endpoint:
   ```
   https://nginx-production-66f6.up.railway.app/billing/plans/active
   ```
   Should return 200 OK với JSON data

## Tương tự cho các services khác

Tất cả các services đều chạy trên port riêng biệt. Set các environment variables sau trong Railway:

```
IDENTITY_SERVICE_PORT=3001
MEMBER_SERVICE_PORT=3002
SCHEDULE_SERVICE_PORT=3003
BILLING_SERVICE_PORT=3004
```

**Lưu ý:** Code đã được cấu hình với default ports này, nhưng tốt nhất là set rõ ràng trong Railway environment variables để đảm bảo đúng.

## Complete Environment Variables Setup

Để gateway hoạt động đúng với tất cả services, set các biến sau trong Railway:

### Option 1: Sử dụng Service URLs + Ports

```
IDENTITY_SERVICE_URL=https://identity-service-production-xxxx.up.railway.app
IDENTITY_SERVICE_PORT=3001
MEMBER_SERVICE_URL=https://member-service-production-xxxx.up.railway.app
MEMBER_SERVICE_PORT=3002
SCHEDULE_SERVICE_URL=https://schedule-service-production-xxxx.up.railway.app
SCHEDULE_SERVICE_PORT=3003
BILLING_SERVICE_URL=https://billing-service-production-6ef9.up.railway.app
BILLING_SERVICE_PORT=3004
```

### Option 2: Sử dụng Host và Port riêng biệt

```
IDENTITY_SERVICE_HOST=identity-service-production-xxxx.up.railway.app
IDENTITY_SERVICE_PORT=3001
MEMBER_SERVICE_HOST=member-service-production-xxxx.up.railway.app
MEMBER_SERVICE_PORT=3002
SCHEDULE_SERVICE_HOST=schedule-service-production-xxxx.up.railway.app
SCHEDULE_SERVICE_PORT=3003
BILLING_SERVICE_HOST=billing-service-production-6ef9.up.railway.app
BILLING_SERVICE_PORT=3004
```
