# Debug 502 Bad Gateway Error

## Vấn đề: 502 Bad Gateway khi truy cập `/billing/plans/active`

Lỗi 502 có nghĩa là nginx không thể kết nối được với upstream service (billing service).

## Các nguyên nhân có thể:

### 1. Environment Variables chưa được set

**Kiểm tra:**

- Vào Railway dashboard → Gateway service → Variables
- Đảm bảo đã set `BILLING_SERVICE_URL` hoặc `BILLING_SERVICE_HOST` + `BILLING_SERVICE_PORT`

**Giải pháp:**

```
BILLING_SERVICE_URL=https://billing-service-production-6ef9.up.railway.app
```

### 2. Hostname không resolve được từ trong container

Railway public URLs có thể không resolve được từ trong container của gateway.

**Giải pháp:** Sử dụng Railway's Private Networking

Railway cung cấp private networking giữa các services trong cùng project. Thay vì dùng public URLs, bạn có thể:

1. **Option A: Sử dụng Railway Service Variables**

   - Railway tự động tạo các biến như `${{BillingService.PORT}}` và `${{BillingService.HOSTNAME}}`
   - Trong Gateway service variables, set:
     ```
     BILLING_SERVICE_HOST=${{BillingService.HOSTNAME}}
     BILLING_SERVICE_PORT=${{BillingService.PORT}}
     ```

2. **Option B: Sử dụng Service Name**
   - Nếu services trong cùng Railway project, có thể dùng service name
   - Set:
     ```
     BILLING_SERVICE_HOST=billing-service-production-6ef9
     BILLING_SERVICE_PORT=80
     ```

### 3. Port không đúng

Railway services có thể expose port khác nhau.

**Kiểm tra:**

- Vào Billing service → Settings → Ports
- Xem port nào đang được expose

**Giải pháp:**

- Nếu service expose port 3004, set: `BILLING_SERVICE_PORT=3004`
- Nếu service expose port 80, set: `BILLING_SERVICE_PORT=80`

### 4. Service chưa sẵn sàng

**Kiểm tra:**

- Vào Billing service → Deployments
- Đảm bảo service đang chạy và healthy

**Test:**

```bash
curl https://billing-service-production-6ef9.up.railway.app/plans/active
```

## Cách Debug:

### Bước 1: Kiểm tra Logs

Vào Gateway service → Deployments → Logs, tìm:

```
=== Gateway Configuration ===
BILLING_SERVICE: http://billing-service-production-6ef9.up.railway.app:80
```

Verify hostname và port đúng chưa.

### Bước 2: Kiểm tra Generated nginx.conf

Trong logs, tìm phần:

```
=== Generated nginx.conf (first 50 lines) ===
```

Kiểm tra upstream config:

```
upstream billing_service {
    server billing-service-production-6ef9.up.railway.app:80;
}
```

### Bước 3: Test từ trong container (nếu có thể)

Nếu Railway hỗ trợ exec vào container:

```bash
# Test DNS resolution
nslookup billing-service-production-6ef9.up.railway.app

# Test connection
nc -zv billing-service-production-6ef9.up.railway.app 80
```

### Bước 4: Kiểm tra nginx error logs

Trong logs, tìm các dòng error:

```
[error] connect() failed (111: Connection refused)
[error] connect() failed (110: Connection timed out)
```

## Giải pháp được khuyến nghị:

### Sử dụng Railway Private Networking (Best Practice)

1. **Trong Gateway service variables, set:**

   ```
   BILLING_SERVICE_HOST=${{BillingService.HOSTNAME}}
   BILLING_SERVICE_PORT=${{BillingService.PORT}}
   ```

   Hoặc nếu Railway không hỗ trợ variables này, thử:

   ```
   BILLING_SERVICE_HOST=${{BillingService.RAILWAY_PRIVATE_DOMAIN}}
   BILLING_SERVICE_PORT=80
   ```

2. **Hoặc sử dụng service name trực tiếp:**

   ```
   BILLING_SERVICE_HOST=billing-service-production-6ef9
   BILLING_SERVICE_PORT=80
   ```

3. **Redeploy và test lại**

## Checklist Debug:

- [ ] Environment variables đã được set
- [ ] Billing service đang chạy và healthy
- [ ] Port đúng (kiểm tra trong Billing service settings)
- [ ] Hostname đúng (copy từ Billing service public domain)
- [ ] Đã thử dùng Railway private networking
- [ ] Đã kiểm tra logs để xem lỗi cụ thể
- [ ] Đã test trực tiếp billing service URL

## Nếu vẫn không được:

1. Thử dùng IP thay vì hostname (nếu Railway cung cấp)
2. Kiểm tra Railway documentation về private networking
3. Thử dùng HTTP thay vì HTTPS cho internal communication
4. Kiểm tra firewall/network policies trong Railway
