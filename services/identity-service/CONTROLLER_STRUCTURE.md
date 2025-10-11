# Identity Service - Controller Structure

## 📁 **Cấu trúc Controller mới**

### **1. Core Authentication (`auth.controller.js`)**

- `login()` - Đăng nhập với email/phone
- `logout()` - Đăng xuất
- `registerMember()` - Đăng ký thành viên mới
- `sendRegistrationOTP()` - Gửi OTP đăng ký
- `verifyRegistrationOTP()` - Xác thực OTP
- `verifyEmail()` - Xác thực email
- `resendEmailVerification()` - Gửi lại email xác thực
- `forgotPassword()` - Quên mật khẩu
- `resetPassword()` - Reset mật khẩu
- `validateResetToken()` - Xác thực token reset
- `refreshToken()` - Làm mới token
- `verify2FALogin()` - Xác thực 2FA cho login
- `getProfile()` - Lấy thông tin profile

### **2. Profile Management (`profile.controller.js`)**

- `getProfile()` - Lấy thông tin profile
- `updateProfile()` - Cập nhật profile
- `changePassword()` - Đổi mật khẩu
- `uploadAvatar()` - Upload avatar
- `deactivateAccount()` - Vô hiệu hóa tài khoản
- `deleteAccount()` - Xóa tài khoản
- `reactivateAccount()` - Kích hoạt lại tài khoản (Admin)

### **3. Security & 2FA (`security.controller.js`)**

- `verify2FALogin()` - Xác thực 2FA cho login
- `enable2FA()` - Bật 2FA
- `verify2FA()` - Xác thực 2FA setup
- `disable2FA()` - Tắt 2FA
- `get2FAQRCode()` - Lấy QR code 2FA
- `addIPWhitelist()` - Thêm IP vào whitelist
- `removeIPWhitelist()` - Xóa IP khỏi whitelist
- `getWhitelistedIPs()` - Lấy danh sách IP whitelist
- `addTrustedLocation()` - Thêm vị trí tin cậy
- `getTrustedLocations()` - Lấy danh sách vị trí tin cậy
- `blockLocation()` - Chặn vị trí

### **4. Device Management (`device.controller.js`)**

- `getDevices()` - Lấy danh sách thiết bị
- `logoutDevice()` - Đăng xuất thiết bị cụ thể
- `revokeAllSessions()` - Thu hồi tất cả session
- `getSessionInfo()` - Lấy thông tin session hiện tại

### **5. Analytics & Monitoring (`analytics.controller.js`)**

- `getAccessStats()` - Thống kê truy cập
- `getLoginHistory()` - Lịch sử đăng nhập
- `getFailedAttempts()` - Lần thử thất bại
- `getDeviceActivity()` - Hoạt động thiết bị
- `getAuditLogs()` - Log kiểm tra
- `getUserActions()` - Hành động người dùng
- `getAdminActions()` - Hành động admin (Admin only)

### **6. Notification System (`notification.controller.js`)**

- `setNotificationPreferences()` - Cài đặt thông báo
- `getNotifications()` - Lấy thông báo
- `markNotificationRead()` - Đánh dấu đã đọc
- `markAllNotificationsRead()` - Đánh dấu tất cả đã đọc

### **7. System Management (`system.controller.js`)**

- `getSystemStats()` - Thống kê hệ thống (Admin)
- `enableMaintenanceMode()` - Bật chế độ bảo trì (Super Admin)
- `disableMaintenanceMode()` - Tắt chế độ bảo trì (Super Admin)
- `healthCheck()` - Kiểm tra sức khỏe hệ thống

### **8. Multi-tenant Support (`tenant.controller.js`)**

- `joinGym()` - Tham gia gym
- `leaveGym()` - Rời gym
- `getGymMemberships()` - Lấy danh sách gym
- `setPrimaryGym()` - Đặt gym chính

## 🛣️ **API Endpoints**

### **Authentication Routes (`/auth`)**

```
POST   /auth/login
POST   /auth/logout
POST   /auth/register
POST   /auth/send-otp
POST   /auth/verify-otp
POST   /auth/verify-email
POST   /auth/resend-email-verification
POST   /auth/forgot-password
POST   /auth/reset-password
GET    /auth/validate-reset-token/:token
POST   /auth/refresh-token
POST   /auth/verify-2fa-login
GET    /auth/profile
POST   /auth/register-admin (Super Admin)
```

### **Profile Routes (`/profile`)**

```
GET    /profile
PUT    /profile
PUT    /profile/change-password
POST   /profile/upload-avatar
POST   /profile/deactivate-account
POST   /profile/delete-account
POST   /profile/reactivate-account/:userId (Admin)
```

### **Security Routes (`/security`)**

```
POST   /security/verify-2fa-login
POST   /security/enable-2fa
POST   /security/verify-2fa
POST   /security/disable-2fa
GET    /security/2fa-qr-code
POST   /security/whitelist-ip
DELETE /security/whitelist-ip/:ipAddress
GET    /security/whitelist-ips
POST   /security/trusted-locations
GET    /security/trusted-locations
POST   /security/block-location
```

### **Device Routes (`/devices`)**

```
GET    /devices
DELETE /devices/:deviceId
POST   /devices/revoke-all-sessions
GET    /devices/session-info
```

### **Analytics Routes (`/analytics`)**

```
GET    /analytics/access-stats
GET    /analytics/login-history
GET    /analytics/failed-attempts
GET    /analytics/device-activity
GET    /analytics/audit-logs
GET    /analytics/user-actions
GET    /analytics/admin-actions (Admin)
```

### **Notification Routes (`/notifications`)**

```
PUT    /notifications/preferences
GET    /notifications
PUT    /notifications/:notificationId/read
PUT    /notifications/read-all
```

### **System Routes (`/system`)**

```
GET    /system/health-check
GET    /system/stats (Admin)
POST   /system/maintenance-mode (Super Admin)
DELETE /system/maintenance-mode (Super Admin)
```

### **Tenant Routes (`/tenant`)**

```
POST   /tenant/join-gym
DELETE /tenant/leave-gym/:gymId
GET    /tenant/gym-memberships
PUT    /tenant/primary-gym
```

## 🔧 **Lợi ích của cấu trúc mới**

1. **Dễ maintain**: Mỗi controller có trách nhiệm rõ ràng
2. **Dễ test**: Test từng module riêng biệt
3. **Dễ scale**: Thêm tính năng mới không ảnh hưởng code cũ
4. **Dễ đọc**: Code ngắn gọn, dễ hiểu
5. **Team work**: Nhiều dev có thể làm việc song song
6. **Separation of Concerns**: Tách biệt rõ ràng các chức năng
7. **Reusability**: Có thể tái sử dụng logic giữa các controller

## 📝 **Cách sử dụng**

1. **Import controller**: `const { ProfileController } = require('./controllers/profile.controller.js');`
2. **Tạo instance**: `const profileController = new ProfileController();`
3. **Sử dụng method**: `profileController.getProfile(req, res);`
4. **Mount routes**: `router.use('/profile', profileRoutes);`

## 🚀 **Next Steps**

1. Test tất cả endpoints
2. Thêm validation middleware
3. Thêm error handling
4. Thêm logging
5. Thêm rate limiting
6. Thêm caching
7. Thêm monitoring
