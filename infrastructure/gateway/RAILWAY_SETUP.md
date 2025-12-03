# Railway Setup Checklist cho Gateway

## ⚠️ QUAN TRỌNG: Root Directory

**BẮT BUỘC:** Phải set Root Directory trong Railway dashboard!

### Các bước setup:

1. **Tạo Service mới trong Railway**

   - Vào Railway dashboard
   - Click "New Service" → "GitHub Repo"
   - Chọn repository của bạn

2. **Set Root Directory** (BƯỚC QUAN TRỌNG NHẤT!)

   - Vào **Settings** của service vừa tạo
   - Tìm phần **"Root Directory"** hoặc **"Source"**
   - Nhập: `infrastructure/gateway`
   - **Save changes**

3. **Kiểm tra Files**
   Đảm bảo các file sau có trong `infrastructure/gateway/`:

   - ✅ `Dockerfile`
   - ✅ `railway.json`
   - ✅ `entrypoint.sh`
   - ✅ `nginx/nginx.conf.template`

4. **Set Environment Variables**
   Thêm các biến môi trường sau trong Railway dashboard:

   **Option 1: Sử dụng Service URLs** (Recommended)

   ```
   IDENTITY_SERVICE_URL=<URL của identity service>
   MEMBER_SERVICE_URL=<URL của member service>
   SCHEDULE_SERVICE_URL=<URL của schedule service>
   BILLING_SERVICE_URL=<URL của billing service>
   ```

   **Option 2: Sử dụng Host và Port**

   ```
   IDENTITY_SERVICE_HOST=<hostname>
   IDENTITY_SERVICE_PORT=3001
   MEMBER_SERVICE_HOST=<hostname>
   MEMBER_SERVICE_PORT=3002
   SCHEDULE_SERVICE_HOST=<hostname>
   SCHEDULE_SERVICE_PORT=3003
   BILLING_SERVICE_HOST=<hostname>
   BILLING_SERVICE_PORT=3004
   ```

5. **Deploy**
   - Railway sẽ tự động detect `railway.json` và `Dockerfile`
   - Click "Deploy" hoặc push code lên GitHub để trigger auto-deploy

## Troubleshooting

### Lỗi: "Dockerfile does not exist"

**Nguyên nhân:** Root Directory chưa được set đúng

**Giải pháp:**

1. Vào Settings của service
2. Set Root Directory = `infrastructure/gateway`
3. Save và redeploy

### Lỗi: "Cannot find nginx.conf.template"

**Nguyên nhân:** File chưa được commit vào git hoặc đường dẫn sai

**Giải pháp:**

1. Đảm bảo file `nginx/nginx.conf.template` đã được commit
2. Kiểm tra Root Directory đã được set đúng chưa

### Lỗi: "Permission denied" khi chạy entrypoint.sh

**Nguyên nhân:** File không có quyền execute

**Giải pháp:**

- File đã được set quyền trong Dockerfile: `RUN chmod +x /entrypoint.sh`
- Nếu vẫn lỗi, kiểm tra lại Dockerfile

## Verify Deployment

Sau khi deploy thành công:

- Health check: `https://your-gateway.up.railway.app/health`
- Should return: `healthy`
