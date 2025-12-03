# Troubleshooting Gateway trên Railway

## Vấn đề: Gateway trả về trang mặc định của nginx

**Triệu chứng:** Truy cập `https://your-gateway.up.railway.app` thấy trang "Welcome to nginx!" thay vì proxy requests.

**Nguyên nhân:** Nginx config chưa được generate hoặc không được load đúng.

**Giải pháp:**

1. **Kiểm tra Environment Variables**

   - Vào Railway dashboard → Gateway service → Variables
   - Đảm bảo đã set các biến:
     - `IDENTITY_SERVICE_URL` hoặc `IDENTITY_SERVICE_HOST` + `IDENTITY_SERVICE_PORT`
     - `MEMBER_SERVICE_URL` hoặc `MEMBER_SERVICE_HOST` + `MEMBER_SERVICE_PORT`
     - `SCHEDULE_SERVICE_URL` hoặc `SCHEDULE_SERVICE_HOST` + `SCHEDULE_SERVICE_PORT`
     - `BILLING_SERVICE_URL` hoặc `BILLING_SERVICE_HOST` + `BILLING_SERVICE_PORT`

2. **Kiểm tra Logs**

   - Vào Railway dashboard → Gateway service → Deployments → Logs
   - Tìm các dòng:
     - `=== Gateway Configuration ===`
     - `Generating nginx.conf from template...`
     - `Testing nginx configuration...`
   - Nếu thấy lỗi, kiểm tra lại environment variables

3. **Verify nginx.conf được generate**
   - Trong logs, tìm phần `=== Generated nginx.conf (first 50 lines) ===`
   - Kiểm tra xem các upstream servers có đúng không

## Vấn đề: 404 khi truy cập qua gateway nhưng OK khi truy cập trực tiếp service

**Triệu chứng:**

- `https://billing-service.up.railway.app/plans/active` → 200 OK ✅
- `https://gateway.up.railway.app/billing/plans/active` → 404 ❌

**Nguyên nhân:**

- Service URLs chưa được set đúng
- Port không đúng (Railway URLs không có port, gateway cần dùng port 80)

**Giải pháp:**

1. **Set Service URLs đúng format:**

   ```
   BILLING_SERVICE_URL=https://billing-service-production-6ef9.up.railway.app
   ```

   Hoặc:

   ```
   BILLING_SERVICE_HOST=billing-service-production-6ef9.up.railway.app
   BILLING_SERVICE_PORT=80
   ```

2. **Kiểm tra logs để verify:**

   ```
   === Gateway Configuration ===
   BILLING_SERVICE: billing-service-production-6ef9.up.railway.app:80
   ```

3. **Redeploy sau khi thay đổi environment variables**

## Vấn đề: Gateway không proxy được requests

**Triệu chứng:** Gateway trả về 502 Bad Gateway hoặc Connection refused

**Nguyên nhân:**

- Service URLs không đúng
- Services chưa được deploy
- Port không đúng

**Giải pháp:**

1. **Verify services đã được deploy:**

   - Kiểm tra trong Railway dashboard
   - Đảm bảo tất cả services (identity, member, schedule, billing) đều đang chạy

2. **Test service URLs:**

   - Thử truy cập trực tiếp service URL trong browser hoặc curl
   - Ví dụ: `curl https://billing-service-production-6ef9.up.railway.app/health`

3. **Kiểm tra port:**
   - Railway public URLs thường dùng port 80 (HTTP) hoặc 443 (HTTPS)
   - Gateway sẽ tự động detect port từ URL
   - Nếu URL không có port, gateway sẽ dùng port 80

## Debug Commands

Nếu cần debug sâu hơn, bạn có thể exec vào container (nếu Railway hỗ trợ):

```bash
# Xem nginx config đã được generate
cat /etc/nginx/nginx.conf

# Test nginx config
nginx -t

# Xem nginx logs
tail -f /var/log/nginx/error.log
tail -f /var/log/nginx/access.log
```

## Checklist khi gặp vấn đề

- [ ] Root Directory đã được set = `infrastructure/gateway`
- [ ] Tất cả environment variables đã được set
- [ ] Service URLs đúng format (có thể dùng HTTPS URLs)
- [ ] Tất cả services đã được deploy và đang chạy
- [ ] Đã redeploy gateway sau khi thay đổi environment variables
- [ ] Đã kiểm tra logs để xem lỗi cụ thể
