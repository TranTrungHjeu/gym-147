# Code Cleanup Required After Migration

## ⚠️ QUAN TRỌNG: Sau khi chạy SQL migration, cần update code sau:

### 1. Backend Code Updates

#### `services/billing-service/src/controllers/billing.controller.js`

**Xóa các references đến Invoice:**
- Xóa method `getAllInvoices()` (line ~1916)
- Xóa method `createInvoice()` (line ~1964)
- Xóa tất cả code tạo invoice trong `renewSubscription()` (line ~1011-1059)
- Xóa tất cả code tạo invoice trong webhook handlers
- Xóa `include: { invoices: true }` trong queries

**Xóa các references đến các field đã xóa:**
- `setup_fee` - Xóa trong `createPlan()` và `updatePlan()`
- `class_credits` - Xóa trong `createPlan()`, `updatePlan()`, `createSubscription()`
- `access_hours`, `access_areas` - Xóa trong `createPlan()`
- `equipment_priority`, `nutritionist_consultations`, `wearable_integration`, `advanced_analytics` - Xóa trong select queries
- `tax_amount` - Xóa trong `renewSubscription()`
- `classes_used`, `classes_remaining` - Xóa trong `createSubscription()`, `upgradeDowngradeSubscription()`
- `auto_renew` - Xóa trong `createSubscription()`, `cancelSubscription()`
- `payment_method_id` - Xóa trong `createSubscription()`, `renewSubscription()`
- `gateway_fee`, `gateway`, `transaction_id`, `metadata`, `reference_id`, `description` - Xóa trong `processPayment()`, webhook handlers

#### `services/billing-service/src/services/member-analytics.service.js`

**Xóa toàn bộ file hoặc comment out:**
- Tất cả references đến `memberLifetimeValue`
- Methods: `updateMemberLTV()`, `getAtRiskMembers()`, `getTopMembersByLTV()`

#### `services/billing-service/src/controllers/analytics.controller.js`

**Xóa các methods:**
- `getMemberLTV()` (line ~491)
- `updateMemberLTV()` (line ~523)
- `getAtRiskMembers()` (line ~555)
- `getTopMembersByLTV()` (line ~587)
- `exportMemberAnalyticsExcel()` (line ~968)

#### `services/billing-service/src/controllers/bankTransfer.controller.js`

**Xóa references:**
- `sepay_webhook_data` - Xóa trong webhook handler
- `bank_transaction_id` - Xóa trong verify methods
- `notes` - Xóa trong cancel method

#### `services/billing-service/src/routes/billing.routes.js`

**Xóa routes:**
- `router.get('/invoices', ...)`
- `router.post('/invoices', ...)`

#### `services/billing-service/src/services/notification.service.js`

**Xóa method:**
- `createInvoiceNotification()` (line ~265)

### 2. Frontend Code Updates

#### `apps/mobile-user/types/billingTypes.ts`

**Xóa:**
- `setup_fee`, `class_credits`, `access_hours`, `access_areas`
- `equipment_priority`, `nutritionist_consultations`
- `wearable_integration`, `advanced_analytics`
- `billing_interval`
- `Invoice` interface
- `Subscription.addons`

#### `apps/mobile-user/services/billing/payment.service.ts`

**Xóa methods:**
- `getMemberInvoices()`
- `getInvoiceById()`

#### `apps/mobile-user/app/subscription/index.tsx`

**Xóa:**
- Code hiển thị addons (đã xóa trước đó)
- References đến các field đã xóa

#### `apps/mobile-user/components/PlanCard.tsx`

**Xóa:**
- Code hiển thị `class_credits` (nếu còn)
- Code hiển thị các field đã xóa

#### `apps/web-admin/src/services/billing.service.ts`

**Xóa methods:**
- `getAllInvoices()`
- `createInvoice()`

### 3. Schema Updates (Đã làm)

✅ Schema đã được update trong `prisma/schema.prisma`

### 4. Sau khi update code

1. Chạy `npx prisma generate` để update Prisma client
2. Test tất cả endpoints
3. Kiểm tra không có lỗi runtime

## Lưu ý

⚠️ **Một số field như `metadata`, `reference_id`, `description` trong Payment có thể đang được sử dụng. Cần kiểm tra kỹ trước khi xóa trong code.**

⚠️ **Invoice có thể đang được sử dụng trong production. Cần backup data trước khi xóa.**




