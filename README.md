<p align="center">
  <img src="apps/mobile-user/assets/images/icon.png" alt="GYM-147 Logo" width="120" height="120">
</p>

<h1 align="center">GYM-147</h1>

<p align="center">
  <strong>Comprehensive Gym Management System</strong>
</p>

<p align="center">
  <a href="#overview">Overview</a> |
  <a href="#features">Features</a> |
  <a href="#architecture">Architecture</a> |
  <a href="#installation">Installation</a> |
  <a href="#api-documentation">API</a> |
  <a href="#license">License</a>
</p>

---

## Overview

GYM-147 is a full-stack gym management platform designed for modern fitness centers. It provides a complete solution for member management, class scheduling, equipment tracking, payment processing, and real-time analytics.

### Tech Stack

| Layer          | Technology                            |
| -------------- | ------------------------------------- |
| **Mobile App** | React Native, Expo SDK 54, TypeScript |
| **Web Admin**  | React 18, Vite, TailwindCSS, MUI      |
| **Backend**    | Node.js, Express, Prisma ORM          |
| **Database**   | PostgreSQL 16 with pgvector           |
| **Cache**      | Redis 7                               |
| **Gateway**    | Nginx                                 |
| **Container**  | Docker, Docker Compose                |

---

## Features

### Member Application (Mobile)

| Module             | Description                                    |
| ------------------ | ---------------------------------------------- |
| **Authentication** | Email/password, Google OAuth, Face ID login    |
| **Profile**        | Personal info, health metrics, workout history |
| **Classes**        | Browse, book, cancel classes with trainers     |
| **Check-in**       | QR code and RFID access control                |
| **Subscription**   | View plans, purchase, payment history          |
| **Workouts**       | AI-generated workout plans, exercise library   |
| **Rewards**        | Points system, achievements, challenges        |
| **Notifications**  | Real-time push notifications                   |

### Admin Dashboard (Web)

| Module        | Description                              |
| ------------- | ---------------------------------------- |
| **Dashboard** | Revenue analytics, member statistics     |
| **Members**   | CRUD operations, subscription management |
| **Trainers**  | Profile, schedule, performance tracking  |
| **Classes**   | Create, edit, manage class sessions      |
| **Equipment** | Inventory, maintenance, QR tracking      |
| **Payments**  | Invoice management, refund processing    |
| **Reports**   | Export PDF/Excel, scheduled reports      |
| **Settings**  | System configuration, user roles         |

---

## Architecture

```
gym-147/
├── apps/
│   ├── mobile-user/          # React Native mobile app
│   └── web-admin/            # React admin dashboard
├── services/
│   ├── identity-service/     # Auth, users, notifications (Port 3001)
│   ├── member-service/       # Members, equipment, health (Port 3002)
│   ├── schedule-service/     # Classes, trainers, bookings (Port 3003)
│   └── billing-service/      # Plans, subscriptions, payments (Port 3004)
├── packages/
│   ├── shared-config/        # Shared configuration
│   ├── shared-middleware/    # Common middleware
│   ├── shared-types/         # TypeScript types
│   └── shared-utils/         # Utility functions
├── infrastructure/
│   ├── docker/               # Docker compose files
│   ├── gateway/              # Nginx API gateway
│   └── database/             # Database init scripts
└── docs/                     # Documentation
```

### Service Communication

```
┌─────────────────┐     ┌─────────────────┐
│   Mobile App    │     │   Web Admin     │
└────────┬────────┘     └────────┬────────┘
         │                       │
         └───────────┬───────────┘
                     │
              ┌──────▼──────┐
              │   Gateway   │
              │   (Nginx)   │
              └──────┬──────┘
                     │
     ┌───────┬───────┼───────┬───────┐
     │       │       │       │       │
┌────▼──┐ ┌──▼───┐ ┌─▼────┐ ┌▼─────┐
│Identity│ │Member│ │Schedule│ │Billing│
│ :3001  │ │:3002 │ │ :3003  │ │:3004  │
└────┬───┘ └──┬───┘ └───┬───┘ └──┬───┘
     │        │         │        │
     └────────┴────┬────┴────────┘
                   │
            ┌──────▼──────┐
            │  PostgreSQL │
            │    Redis    │
            └─────────────┘
```

---

## Installation

### Prerequisites

- Node.js >= 18.x
- Docker & Docker Compose
- Android Studio (for mobile dev)
- Git

---

### Quick Start (Mobile APK)

Download and install the pre-built APK:

| Platform | Download Link                                                                              |
| -------- | ------------------------------------------------------------------------------------------ |
| Android  | [gym147-mobile.apk](https://www.mediafire.com/file/i0h9fddke80c3pa/gym147-mobile.apk/file) |

> **Note:** Enable "Install from Unknown Sources" in Android settings before installation.

---

### Development Setup

#### 1. Clone Repository

```bash
git clone https://github.com/TranTrungHiu/gym-147.git
cd gym-147
```

#### 2. Install Dependencies

```bash
# Install root dependencies
npm install

# Install all workspace packages
npm install --workspaces
```

#### 3. Environment Configuration

Create `.env` files for each service:

**services/identity-service/.env**

```env
DATABASE_URL="postgresql://gym:secret@localhost:5432/gym_identity"
JWT_SECRET="your-jwt-secret"
JWT_EXPIRES_IN="7d"
REDIS_URL="redis://localhost:6380"
PORT=3001
```

**services/member-service/.env**

```env
DATABASE_URL="postgresql://gym:secret@localhost:5432/gym_member"
REDIS_URL="redis://localhost:6380"
PORT=3002
```

**services/schedule-service/.env**

```env
DATABASE_URL="postgresql://gym:secret@localhost:5432/gym_schedule"
REDIS_URL="redis://localhost:6380"
PORT=3003
```

**services/billing-service/.env**

```env
DATABASE_URL="postgresql://gym:secret@localhost:5432/gym_billing"
REDIS_URL="redis://localhost:6380"
VNPAY_TMN_CODE="your-vnpay-code"
VNPAY_HASH_SECRET="your-vnpay-secret"
PORT=3004
```

#### 4. Start Infrastructure (Docker)

```bash
cd infrastructure/docker
docker-compose up -d
```

This starts:

- PostgreSQL (port 5432)
- Redis (port 6380)
- All microservices
- Nginx Gateway (port 8080)

#### 5. Run Database Migrations

```bash
# Run migrations for each service
cd services/identity-service && npx prisma migrate dev
cd ../member-service && npx prisma migrate dev
cd ../schedule-service && npx prisma migrate dev
cd ../billing-service && npx prisma migrate dev
```

---

### Web Admin (Development)

```bash
cd apps/web-admin

# Install dependencies
npm install

# Start development server
npm run dev
```

Access at: `http://localhost:5173`

#### Build for Production

```bash
npm run build
```

Output: `apps/web-admin/dist/`

---

### Mobile App (Development)

#### Prerequisites

- Expo CLI: `npm install -g expo-cli`
- EAS CLI: `npm install -g eas-cli`
- Android Studio with emulator configured

#### Run Development Server

```bash
cd apps/mobile-user

# Install dependencies
npm install

# Start Expo development server
npm start
```

#### Run on Android

```bash
# With emulator running
npm run android

# Or scan QR code with Expo Go app
npm start
```

#### Configure API Endpoint

Edit `apps/mobile-user/config/environment.ts`:

```typescript
export const API_BASE_URL = 'http://YOUR_IP:8080/api';
```

> **Tip:** Use your local IP address (not localhost) when testing on physical device.

#### Build APK

```bash
# Configure EAS
eas build:configure

# Build APK
eas build --platform android --profile preview
```

---

## API Documentation

### Base URL

- Development: `http://localhost:8080/api`
- Production: `https://your-domain.com/api`

### Endpoints Overview

| Service  | Prefix           | Description             |
| -------- | ---------------- | ----------------------- |
| Identity | `/api/auth/*`    | Authentication, users   |
| Member   | `/api/members/*` | Member management       |
| Schedule | `/api/classes/*` | Classes, bookings       |
| Billing  | `/api/billing/*` | Payments, subscriptions |

### Authentication

All protected endpoints require JWT token:

```
Authorization: Bearer <access_token>
```

---

## Project Structure Details

### Mobile App (`apps/mobile-user/`)

```
app/
├── (auth)/           # Login, register screens
├── (tabs)/           # Main tab navigation
├── access/           # QR code, RFID screens
├── achievements/     # Badges, milestones
├── challenges/       # Fitness challenges
├── classes/          # Class booking
├── equipment/        # Equipment info
├── health/           # Health metrics
├── leaderboard/      # Rankings
├── notifications/    # Push notifications
├── profile/          # User profile
├── rewards/          # Points, rewards
├── settings/         # App settings
├── subscription/     # Plans, payments
└── workouts/         # Workout plans
```

### Web Admin (`apps/web-admin/`)

```
src/
├── components/       # Reusable UI components
├── pages/            # Route pages
│   ├── Analytics/    # Data visualization
│   ├── Dashboard/    # Overview dashboard
│   ├── Management/   # CRUD operations
│   └── Reports/      # Report generation
├── services/         # API service layer
├── hooks/            # Custom React hooks
└── locales/          # i18n translations
```

---

## Scripts Reference

### Root Level

```bash
npm run dev           # Start all services
npm run build         # Build all packages
npm run test          # Run all tests
```

### Mobile App

```bash
npm start             # Start Expo server
npm run android       # Run on Android
npm run ios           # Run on iOS
npm run web           # Run web version
npm run test          # Run Jest tests
```

### Web Admin

```bash
npm run dev           # Development server
npm run build         # Production build
npm run preview       # Preview production
```

---

## Payment Integration

### Supported Providers

| Provider              | Status | Region  |
| --------------------- | ------ | ------- |
| VNPay                 | Active | Vietnam |
| Sepay (Bank Transfer) | Active | Vietnam |
| MoMo                  | Active | Vietnam |

---

## Contributing

1. Fork the repository
2. Create feature branch (`git checkout -b feature/amazing-feature`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push to branch (`git push origin feature/amazing-feature`)
5. Open Pull Request

---

## License

This project is developed as part of a university thesis (Khoa Luan Tot Nghiep).

---

## Contact

- **Author:** Tran Trung Hieu
- **Repository:** [github.com/TranTrungHiu/gym-147](https://github.com/TranTrungHiu/gym-147)

---

<p align="center">
  <sub>Built with dedication for modern fitness management</sub>
</p>
