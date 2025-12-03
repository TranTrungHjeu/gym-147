# Railway Environment Variables - Complete Setup

## Tất cả Environment Variables cần thiết cho Gateway

Copy và paste các biến sau vào Railway dashboard → Gateway service → Variables:

### Option 1: Sử dụng Service URLs + Ports (Recommended)

```bash
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

```bash
IDENTITY_SERVICE_HOST=identity-service-production-xxxx.up.railway.app
IDENTITY_SERVICE_PORT=3001

MEMBER_SERVICE_HOST=member-service-production-xxxx.up.railway.app
MEMBER_SERVICE_PORT=3002

SCHEDULE_SERVICE_HOST=schedule-service-production-xxxx.up.railway.app
SCHEDULE_SERVICE_PORT=3003

BILLING_SERVICE_HOST=billing-service-production-6ef9.up.railway.app
BILLING_SERVICE_PORT=3004
```

## Cách lấy Service URLs trong Railway

1. Vào Railway dashboard
2. Click vào từng service:
   - Identity Service → Copy **Public Domain**
   - Member Service → Copy **Public Domain**
   - Schedule Service → Copy **Public Domain**
   - Billing Service → Copy **Public Domain**
3. Thay thế `xxxx` trong các URL trên bằng domain thực tế của bạn

## Ports mặc định

Code đã được cấu hình với các default ports sau:

- **Identity Service**: 3001
- **Member Service**: 3002
- **Schedule Service**: 3003
- **Billing Service**: 3004

Tuy nhiên, **nên set rõ ràng trong Railway** để đảm bảo đúng.

## Sau khi set Environment Variables

1. **Save** các variables trong Railway dashboard
2. Railway sẽ tự động **redeploy** gateway service
3. Kiểm tra **debug endpoint**:

   ```
   https://nginx-production-66f6.up.railway.app/debug
   ```

   Verify tất cả ports đều đúng (3001, 3002, 3003, 3004)

4. Test các endpoints:
   ```
   https://nginx-production-66f6.up.railway.app/identity/health
   https://nginx-production-66f6.up.railway.app/member/health
   https://nginx-production-66f6.up.railway.app/schedule/health
   https://nginx-production-66f6.up.railway.app/billing/plans/active
   ```

## Troubleshooting

Nếu vẫn gặp lỗi 502:

1. Verify tất cả services đang chạy và healthy
2. Kiểm tra `/debug` endpoint để xem cấu hình
3. Verify ports trong Railway match với ports trong debug output
4. Xem file `DEBUG_502.md` để biết cách debug chi tiết
