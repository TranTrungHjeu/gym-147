# Gym Management System 🏋️‍♂️ — Nhóm 147

Hệ thống quản lý phòng gym hiện đại với kiến trúc **microservices** (kiến trúc vi dịch vụ), hỗ trợ giao diện quản trị và giao diện người dùng.
**Monorepo** (kho mã nguồn đơn) với React + TypeScript + Node.js + PostgreSQL. Triển khai dạng microservices cho KLTN 15 tuần.

## � Trạng thái hiện tại (Cập nhật 19/09/2025)

**🟢 SẴN SÀNG SỬ DỤNG - Các tính năng đã triển khai thành công:**

### ✅ Backend Services (API Services)
- **🔐 Identity Service** (Port 3002) - Dịch vụ xác thực và quản lý người dùng
  - Đăng nhập/đăng ký với mock authentication 
  - Quản lý profile người dùng
  - JWT token generation (mock implementation)
  - Health check endpoint: `/health`

- **👥 Member Service** (Port 3001) - Dịch vụ quản lý thành viên
  - CRUD operations cho thành viên (Tạo, Đọc, Cập nhật, Xóa)
  - Tìm kiếm và lọc thành viên theo trạng thái
  - Pagination (phân trang) cho danh sách lớn
  - Thống kê thành viên

- **📅 Schedule Service** (Port 3003) - Dịch vụ quản lý lịch tập
  - Quản lý lớp học (tạo, sửa, xóa lớp)
  - Tạo lịch tập cho từng lớp học
  - Đặt lịch và hủy lịch cho thành viên
  - Theo dõi sức chứa và số lượng đã đặt

- **💰 Billing Service** (Port 3004) - Dịch vụ thanh toán và hóa đơn
  - Quản lý gói tập (subscription plans)
  - Xử lý thanh toán (mock implementation)
  - Tạo và quản lý hóa đơn
  - Theo dõi trạng thái thanh toán

### ✅ Frontend Application
- **🖥️ Web Admin Interface** - Giao diện quản trị viên
  - Dashboard tổng quan với health check tất cả services
  - Layout responsive với navigation menu
  - React Router setup cho multi-page application
  - Axios HTTP client với interceptors
  - TypeScript type safety cho toàn bộ frontend

### ✅ Infrastructure & DevOps
- **🌐 Nginx Gateway** - API Gateway và reverse proxy
  - Route requests tới đúng microservice
  - Load balancing và caching
  - Serve static files cho frontend

- **🐳 Docker Setup** - Containerization đầy đủ
  - Docker compose cho toàn bộ hệ thống
  - PostgreSQL 16 database container
  - Redis 7 cache container
  - Isolated networking giữa các services

## 🎯 Những gì có thể làm NGAY BÂY GIỜ

### 1. 🚀 Khởi chạy hệ thống
```bash
# Khởi động toàn bộ hệ thống với Docker
docker-compose up -d

# Hoặc chạy từng service riêng lẻ
npm run dev:identity    # Port 3002
npm run dev:member      # Port 3001  
npm run dev:schedule    # Port 3003
npm run dev:billing     # Port 3004
npm run dev:frontend    # Web admin
```

### 2. 📊 Kiểm tra trạng thái hệ thống
- Truy cập web admin tại http://localhost:8080
- Dashboard hiển thị health status của tất cả services
- Kiểm tra từng service endpoint:
  - http://localhost:3001/health (Member Service)
  - http://localhost:3002/health (Identity Service)  
  - http://localhost:3003/health (Schedule Service)
  - http://localhost:3004/health (Billing Service)

### 3. 🔧 API Testing và Development
- Tất cả services có REST API endpoints đầy đủ
- Mock data sẵn sàng để test các chức năng
- Swagger/OpenAPI documentation có thể tích hợp
- Postman collection có thể tạo cho testing

### 4. 🎨 Frontend Development
- Component library cơ bản đã có (Layout, Card)
- Routing structure đã setup
- API service layer đã chuẩn bị
- TypeScript types đã định nghĩa

## 🔧 Tính năng đã triển khai chi tiết

### Giao diện quản trị (Admin)
- ✅ **Dashboard tổng quan**: Hiển thị trạng thái tất cả microservices
- ✅ **Navigation system**: Menu điều hướng giữa các trang
- ✅ **Health monitoring**: Kiểm tra real-time status của backend services
- 🔨 **Quản lý thành viên**: API backend sẵn sàng, UI đang phát triển
- 🔨 **Quản lý lịch tập**: Tạo lịch, phân bổ huấn luyện viên (API ready)
- � **Quản lý thanh toán**: Xử lý thanh toán, đăng ký gói tập (API ready)
- 🔨 **Quản lý đặt lịch**: Theo dõi đặt chỗ, hủy lịch (API ready)

### API Endpoints sẵn sàng
- � **Authentication**: `/api/auth/login`, `/api/auth/register`, `/api/auth/profile`
- 👥 **Members**: CRUD operations với pagination và filtering
- � **Schedules**: Class management, booking system
- 💰 **Billing**: Payment processing, subscription management

## 🏗️ Kiến trúc hệ thống

### Frontend (React + TypeScript)
```
apps/web-admin/
├── src/
│   ├── components/     # UI components
│   ├── pages/         # Route pages  
│   ├── hooks/         # Custom React hooks
│   ├── services/      # API services
│   ├── utils/         # Utility functions
│   ├── types/         # TypeScript definitions
│   └── constants/     # App constants
```

### Backend Microservices (Node.js + TypeScript)
```
services/
├── identity-service/   # Authentication & User management (Port 3002)
├── member-service/     # Member CRUD operations (Port 3001)  
├── schedule-service/   # Classes, schedules, bookings (Port 3003)
└── billing-service/    # Payments, subscriptions (Port 3004)
```

### Shared Libraries
```
libs/
├── shared-types/       # Common TypeScript types
└── shared-backend/     # Common backend utilities
    ├── middleware/     # Auth, validation, error handling
    ├── utils/         # Common utilities  
    └── types/         # Shared type definitions
```

### Gateway & Infrastructure  
```
gateway/nginx/          # Reverse proxy và load balancer
deploy/                 # Docker compose configuration
```

## 🛠️ Công nghệ sử dụng

### Frontend
- **React 18** - UI framework
- **TypeScript** - Type safety
- **Vite** - Build tool
- **React Router** - Routing
- **Axios** - HTTP client
- **TanStack React Query** - Data fetching

### Backend  
- **Node.js** - Runtime
- **Express.js** - Web framework
- **TypeScript** - Type safety
- **JWT** - Authentication
- **bcryptjs** - Password hashing
- **Joi** - Data validation

### Database & Cache
- **PostgreSQL 16** - Primary database
- **Redis 7** - Caching layer

## 📚 Giải thích thuật ngữ

### Kiến trúc & Công nghệ
- **Microservices**: Kiến trúc chia ứng dụng thành nhiều dịch vụ nhỏ độc lập, mỗi service chạy trên process riêng và giao tiếp qua API
- **Monorepo**: Kho mã nguồn đơn chứa nhiều dự án/package liên quan, quản lý tập trung nhưng deploy độc lập
- **API Gateway**: Điểm truy cập duy nhất cho client, route requests tới đúng microservice, xử lý authentication/authorization
- **Reverse Proxy**: Server trung gian chuyển tiếp requests từ client tới backend servers, cung cấp caching và load balancing
- **Load Balancing**: Phân phối requests đến multiple server instances để tối ưu hiệu suất
- **Containerization**: Đóng gói ứng dụng và dependencies vào containers để chạy nhất quán trên mọi môi trường

### Backend Terms
- **REST API**: Architectural style cho web services sử dụng HTTP methods (GET, POST, PUT, DELETE)
- **CRUD Operations**: Create, Read, Update, Delete - 4 thao tác cơ bản với dữ liệu
- **JWT (JSON Web Token)**: Token format để truyền thông tin an toàn giữa parties
- **Middleware**: Functions chạy giữa request và response, xử lý authentication, logging, error handling
- **Mock Implementation**: Code giả lập thay thế dependencies thật trong development/testing
- **Health Check**: Endpoint kiểm tra trạng thái hoạt động của service

### Frontend Terms  
- **SPA (Single Page Application)**: Ứng dụng web load một page duy nhất và dynamically update content
- **Component-based Architecture**: Chia UI thành các components tái sử dụng được
- **State Management**: Quản lý và chia sẻ data giữa các components
- **Responsive Design**: Thiết kế giao diện tự adapt với different screen sizes
- **Type Safety**: Kiểm tra types tại compile time để tránh runtime errors

### Database & DevOps
- **Pagination**: Chia dữ liệu lớn thành nhiều pages nhỏ để tối ưu hiệu suất
- **Indexing**: Tạo index trên database columns để tăng tốc truy vấn
- **Caching**: Lưu trữ tạm thời dữ liệu frequently accessed để giảm database load
- **CI/CD**: Continuous Integration/Continuous Deployment - tự động build, test và deploy code
- **Environment Variables**: Configuration values được set ở OS level thay vì hardcode

### Business Logic
- **Subscription Model**: Mô hình kinh doanh based on recurring payments cho services
- **RFID Tag**: Radio Frequency Identification - thẻ từ để identify members
- **Membership Status**: Trạng thái thành viên (Active/Expired/Suspended)
- **Booking System**: Hệ thống đặt chỗ trước cho classes/facilities

## 🏗️ Kiến trúc hệ thống

### Frontend (React + TypeScript)
```
apps/web-admin/
├── src/
│   ├── components/     # UI components (Layout, Card, etc.)
│   ├── pages/         # Route pages (Dashboard, Members, etc.)
│   ├── hooks/         # Custom React hooks for state management
│   ├── services/      # API services và HTTP client setup
│   ├── utils/         # Utility functions (formatting, validation)
│   ├── types/         # TypeScript type definitions
│   └── constants/     # App constants (API endpoints, status values)
```

### Backend Microservices (Node.js + TypeScript)
```
services/
├── identity-service/   # Authentication & User management (Port 3002)
│   ├── controllers/    # Request handlers
│   ├── services/       # Business logic layer  
│   ├── routes/         # API route definitions
│   └── types/          # Service-specific types
├── member-service/     # Member CRUD operations (Port 3001)
├── schedule-service/   # Classes, schedules, bookings (Port 3003)
└── billing-service/    # Payments, subscriptions (Port 3004)
```

### Shared Libraries
```
libs/
├── shared-types/       # Common TypeScript interfaces
└── shared-backend/     # Common backend utilities
    ├── middleware/     # Auth, validation, error handling
    ├── utils/         # Common utilities (pagination, formatting)
    └── types/         # Shared type definitions
```

### Gateway & Infrastructure  
```
gateway/nginx/          # Reverse proxy configuration
deploy/                 # Docker compose và deployment configs
```

## 🛠️ Công nghệ sử dụng

### Frontend
- **React 18** - Modern UI framework với hooks và concurrent features
- **TypeScript** - Compile-time type checking cho JavaScript
- **Vite** - Fast build tool và dev server
- **React Router** - Client-side routing cho SPA
- **Axios** - Promise-based HTTP client với interceptors
- **TanStack React Query** - Server state management và data fetching

### Backend  
- **Node.js** - JavaScript runtime environment
- **Express.js** - Minimal web framework cho Node.js
- **TypeScript** - Type-safe JavaScript superset
- **JWT** - Stateless authentication mechanism
- **bcryptjs** - Password hashing library
- **Joi** - Object schema validation
- **CORS** - Cross-Origin Resource Sharing middleware
- **Helmet** - Security middleware cho Express
- **Morgan** - HTTP request logger

### Database & Cache
- **PostgreSQL 16** - Advanced relational database
- **Redis 7** - In-memory data structure store cho caching

### DevOps & Tools
- **Docker & Docker Compose** - Container platform và orchestration
- **Nginx** - High-performance web server và reverse proxy
- **ESLint & Prettier** - Code linting và formatting
- **npm Workspaces** - Monorepo package management

## 🚦 Hướng dẫn khởi chạy

### Yêu cầu hệ thống
- Node.js 18+ 
- Docker & Docker Compose
- Git

### Cài đặt và chạy
```bash
# Clone repository
git clone <repository-url>
cd gym-147

# Cài đặt dependencies cho toàn bộ monorepo
npm install

# Khởi động với Docker (Recommended)
cd deploy
docker-compose up -d

# Hoặc chạy development mode
npm run dev:frontend   # Web admin interface
npm run dev:identity   # Authentication service  
npm run dev:member     # Member management service
npm run dev:schedule   # Schedule & booking service
npm run dev:billing    # Billing & payment service
```

### Truy cập ứng dụng
- **Web Admin**: http://localhost:8080
- **API Gateway**: http://localhost:8080/api
- **Services Health Check**:
  - Identity: http://localhost:3002/health
  - Member: http://localhost:3001/health
  - Schedule: http://localhost:3003/health  
  - Billing: http://localhost:3004/health

### Development workflow
```bash
# Type checking cho toàn bộ project
npm run type-check

# Build production
npm run build

# Code formatting
npm run format

# Linting
npm run lint:fix
```

## 📖 API Documentation

### Authentication Service (Port 3002)
```
POST /api/auth/login    - Đăng nhập
POST /api/auth/register - Đăng ký tài khoản  
GET  /api/auth/profile  - Lấy thông tin profile
POST /api/auth/logout   - Đăng xuất
```

### Member Service (Port 3001)  
```
GET    /members         - Lấy danh sách thành viên (với pagination)
GET    /members/:id     - Lấy thông tin thành viên theo ID
POST   /members         - Tạo thành viên mới
PUT    /members/:id     - Cập nhật thông tin thành viên
DELETE /members/:id     - Xóa thành viên
GET    /members/stats   - Thống kê thành viên
```

### Schedule Service (Port 3003)
```
GET    /api/classes     - Lấy danh sách lớp học
POST   /api/classes     - Tạo lớp học mới
GET    /api/schedules   - Lấy lịch tập
POST   /api/schedules   - Tạo lịch tập mới  
GET    /api/bookings    - Lấy danh sách booking
POST   /api/bookings    - Đặt lịch tập
DELETE /api/bookings/:id - Hủy booking
```

### Billing Service (Port 3004)
```
GET    /api/subscriptions - Lấy danh sách subscription
POST   /api/subscriptions - Tạo subscription mới
GET    /api/payments      - Lấy danh sách thanh toán
POST   /api/payments      - Xử lý thanh toán
GET    /api/invoices      - Lấy danh sách hóa đơn
POST   /api/invoices      - Tạo hóa đơn mới
```

## 🔄 Roadmap phát triển

### Phase 1 - MVP (Hoàn thành ✅)
- [x] Backend services foundation
- [x] Basic API endpoints
- [x] Docker containerization  
- [x] Health monitoring
- [x] TypeScript setup

### Phase 2 - Core Features (Đang phát triển 🔨)
- [ ] Database integration (PostgreSQL)
- [ ] Real authentication (replace mocks)
- [ ] Complete member management UI
- [ ] Schedule booking interface
- [ ] Payment processing integration

### Phase 3 - Advanced Features (Kế hoạch 📋)
- [ ] RFID integration
- [ ] Real-time notifications  
- [ ] Mobile app (React Native)
- [ ] Analytics dashboard
- [ ] Automated billing

### Phase 4 - Production Ready (Tương lai 🚀)
- [ ] Production deployment
- [ ] Performance optimization
- [ ] Security hardening
- [ ] Monitoring & logging
- [ ] CI/CD pipeline
