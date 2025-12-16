# Database Structure Improvement Migration

## Tổng Quan

Migration này thực hiện các cải thiện cho cấu trúc database billing service:

1. **Xóa các field redundant không cần thiết**
2. **Thêm database constraints để đảm bảo data integrity**

## Các Thay Đổi

### 1. Xóa Redundant Fields

#### `membership_plans.trial_days`
- **Lý do**: Không được sử dụng trong code
- **Thay thế**: Trial được xử lý qua DiscountCode (FREE_TRIAL)

#### `subscriptions.is_trial`
- **Lý do**: Redundant với `status = 'TRIAL'`
- **Thay thế**: Sử dụng `status = 'TRIAL'` để xác định trial subscription

#### `payments.refunded_at`
- **Lý do**: Chỉ lưu ngày refund cuối cùng, có thể tính từ `MAX(refunds.processed_at)`
- **Thay thế**: Query từ `refunds` table khi cần

#### `payments.refund_reason`
- **Lý do**: Chỉ lưu lý do refund cuối cùng, không có ý nghĩa nếu có nhiều refund
- **Thay thế**: Query từ `refunds` table để lấy tất cả lý do

### 2. Database Constraints

#### `check_refunded_amount`
- **Mục đích**: Đảm bảo `refunded_amount <= amount`
- **Lợi ích**: Ngăn chặn invalid refund amounts ở database level

#### `check_trial_dates`
- **Mục đích**: Đảm bảo `trial_end > trial_start` (nếu cả hai đều tồn tại)
- **Lợi ích**: Đảm bảo trial period hợp lệ

## Cách Chạy Migration

### Option 1: Sử dụng psql (PostgreSQL CLI)

```bash
# Windows PowerShell
$env:PGPASSWORD="your_password"
psql -h localhost -U your_user -d your_database -f prisma/migrations/improve_database_structure.sql

# Linux/Mac
PGPASSWORD=your_password psql -h localhost -U your_user -d your_database -f prisma/migrations/improve_database_structure.sql
```

### Option 2: Sử dụng Prisma Migrate (Recommended)

```bash
# Tạo migration từ schema changes
npx prisma migrate dev --name improve_database_structure

# Hoặc apply migration trên production
npx prisma migrate deploy
```

### Option 3: Sử dụng Database Client (pgAdmin, DBeaver, etc.)

1. Mở file `improve_database_structure.sql`
2. Chạy script trong database client

## Backup Trước Khi Chạy

**QUAN TRỌNG**: Luôn backup database trước khi chạy migration:

```bash
# PostgreSQL backup
pg_dump -h localhost -U your_user -d your_database > backup_before_improve_structure.sql
```

## Kiểm Tra Sau Migration

### 1. Verify Constraints

```sql
-- Check refunded_amount constraint
SELECT 
  id, 
  amount, 
  refunded_amount,
  CASE 
    WHEN refunded_amount IS NULL THEN 'OK'
    WHEN refunded_amount <= amount THEN 'OK'
    ELSE 'VIOLATION'
  END as constraint_check
FROM payments
WHERE refunded_amount IS NOT NULL;

-- Check trial_dates constraint
SELECT 
  id,
  trial_start,
  trial_end,
  CASE 
    WHEN trial_start IS NULL AND trial_end IS NULL THEN 'OK'
    WHEN trial_start IS NOT NULL AND trial_end IS NOT NULL AND trial_end > trial_start THEN 'OK'
    ELSE 'VIOLATION'
  END as constraint_check
FROM subscriptions
WHERE trial_start IS NOT NULL OR trial_end IS NOT NULL;
```

### 2. Verify Removed Columns

```sql
-- Should return 0 rows (columns should not exist)
SELECT column_name 
FROM information_schema.columns 
WHERE table_name = 'membership_plans' AND column_name = 'trial_days';

SELECT column_name 
FROM information_schema.columns 
WHERE table_name = 'subscriptions' AND column_name = 'is_trial';

SELECT column_name 
FROM information_schema.columns 
WHERE table_name = 'payments' AND column_name IN ('refunded_at', 'refund_reason');
```

## Rollback (Nếu Cần)

Nếu cần rollback, chạy script sau:

```sql
BEGIN;

-- Restore columns (with default values)
ALTER TABLE "membership_plans" 
ADD COLUMN "trial_days" INTEGER DEFAULT 0;

ALTER TABLE "subscriptions" 
ADD COLUMN "is_trial" BOOLEAN DEFAULT false;

ALTER TABLE "payments" 
ADD COLUMN "refunded_at" TIMESTAMP(3);

ALTER TABLE "payments" 
ADD COLUMN "refund_reason" TEXT;

-- Remove constraints
ALTER TABLE "payments" 
DROP CONSTRAINT IF EXISTS "check_refunded_amount";

ALTER TABLE "subscriptions" 
DROP CONSTRAINT IF EXISTS "check_trial_dates";

COMMIT;
```

## Ảnh Hưởng Đến Code

### Backend Changes

1. **Subscription Creation**:
   - ❌ Không set `is_trial` nữa
   - ✅ Chỉ set `status = 'TRIAL'` và `trial_start`, `trial_end`

2. **Refund Processing**:
   - ❌ Không set `refunded_at` và `refund_reason` nữa
   - ✅ Chỉ update `refunded_amount` và `status`

3. **Querying**:
   - Để lấy refund date: `SELECT MAX(processed_at) FROM refunds WHERE payment_id = ?`
   - Để lấy refund reasons: `SELECT reason FROM refunds WHERE payment_id = ?`

### Frontend Changes

- Không cần thay đổi vì frontend types không có các field này

## Lưu Ý

1. **Aggregate Fields**: `refunded_amount` được giữ lại vì lý do performance. Application code phải đảm bảo consistency bằng cách update field này mỗi khi có refund mới.

2. **Status Field**: `Payment.status` sẽ tự động được set thành `REFUNDED` hoặc `PARTIALLY_REFUNDED` dựa trên `refunded_amount`.

3. **Trial Detection**: Để kiểm tra trial subscription, sử dụng `status = 'TRIAL'` thay vì `is_trial = true`.

## Support

Nếu gặp vấn đề, kiểm tra:
1. Database logs
2. Application logs
3. Constraint violations trong database











