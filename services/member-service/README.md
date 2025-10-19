# Member Service

A comprehensive microservice for managing gym members, their activities, health metrics, achievements, and more.

## 🚀 Features

### Core Features

- **Member Management**: Complete CRUD operations for gym members
- **Session Tracking**: Real-time gym entry/exit tracking
- **Equipment Usage**: IoT-enabled equipment monitoring
- **Health Metrics**: Comprehensive health data collection
- **AI Workout Plans**: Intelligent workout plan generation
- **Gamification**: Achievement system with points and badges
- **Smart Notifications**: Context-aware notification system
- **Analytics & Reporting**: Detailed insights and reports

### Advanced Features

- **Cross-Service Integration**: Seamless integration with Identity, Schedule, and Billing services
- **Real-time Analytics**: Live dashboard with key metrics
- **IoT Integration**: Support for smart equipment and sensors
- **AI-Powered Recommendations**: Personalized fitness suggestions
- **Comprehensive Reporting**: Detailed reports for management

## 📋 API Endpoints

### Health & Documentation

- `GET /api/v1/health` - Service health check
- `GET /api/v1/api-docs` - Complete API documentation

### Member Management

- `GET /api/v1/members` - Get all members (with pagination)
- `GET /api/v1/members/:id` - Get member by ID
- `GET /api/v1/members/user/:user_id` - Get member by user_id
- `POST /api/v1/members` - Create new member
- `PUT /api/v1/members/:id` - Update member
- `DELETE /api/v1/members/:id` - Delete member

### Session Tracking

- `GET /api/v1/members/:id/sessions` - Get member sessions
- `POST /api/v1/members/:id/sessions/entry` - Record gym entry
- `POST /api/v1/members/:id/sessions/exit` - Record gym exit
- `GET /api/v1/sessions/active` - Get all active sessions

### Equipment Management

- `GET /api/v1/equipment` - Get all equipment
- `POST /api/v1/members/:id/equipment/start` - Start equipment usage
- `POST /api/v1/members/:id/equipment/stop` - Stop equipment usage

### Health Metrics

- `GET /api/v1/members/:id/health-metrics` - Get health metrics
- `POST /api/v1/members/:id/health-metrics` - Record health metric
- `GET /api/v1/members/:id/health-trends` - Get health trends

### Workout Plans

- `GET /api/v1/members/:id/workout-plans` - Get workout plans
- `POST /api/v1/members/:id/workout-plans/ai` - Generate AI workout plan
- `GET /api/v1/members/:id/workout-recommendations` - Get recommendations

### Achievements

- `GET /api/v1/members/:id/achievements` - Get member achievements
- `POST /api/v1/members/:id/achievements/check` - Check and award achievements
- `GET /api/v1/achievements/leaderboard` - Get achievement leaderboard

### Notifications

- `GET /api/v1/members/:id/notifications` - Get notifications
- `POST /api/v1/members/:id/notifications/workout-reminder` - Send workout reminder
- `POST /api/v1/notifications/broadcast` - Broadcast to all members

### Analytics & Reports

- `GET /api/v1/analytics/dashboard` - Get comprehensive dashboard data
- `GET /api/v1/reports/membership` - Generate membership report
- `GET /api/v1/reports/usage` - Generate usage report

## 🛠️ Installation

1. **Clone the repository**

   ```bash
   git clone <repository-url>
   cd member-service
   ```

2. **Install dependencies**

   ```bash
   npm install
   ```

3. **Setup environment variables**

   ```bash
   cp .env.example .env
   # Edit .env with your configuration
   ```

4. **Setup database**

   ```bash
   npx prisma generate
   npx prisma db push
   npx prisma db seed
   ```

5. **Start the service**
   ```bash
   npm start
   ```

## 🗄️ Database Schema

The service uses PostgreSQL with Prisma ORM. Key models include:

- **Member**: Core member information and membership details
- **GymSession**: Entry/exit tracking and session data
- **EquipmentUsage**: Equipment usage logs with IoT data
- **HealthMetric**: Health and fitness metrics
- **WorkoutPlan**: AI-generated and custom workout plans
- **Achievement**: Gamification system with points and badges
- **Notification**: Smart notification system
- **Equipment**: Equipment management and maintenance

## 🔧 Configuration

### Environment Variables

```env
# Server
PORT=3002
HOST=0.0.0.0
NODE_ENV=development

# Database
DATABASE_URL="postgresql://user:password@localhost:5432/member_service_db"

# External Services
IDENTITY_SERVICE_URL=http://localhost:3001
SCHEDULE_SERVICE_URL=http://localhost:3003
BILLING_SERVICE_URL=http://localhost:3004

# Security
JWT_SECRET=your-secret-key
BCRYPT_ROUNDS=12
```

## 🚀 Usage Examples

### Create a Member

```bash
curl -X POST http://localhost:3002/api/v1/members \
  -H "Content-Type: application/json" \
  -d '{
    "user_id": "user123",
    "full_name": "John Doe",
    "phone": "+1234567890",
    "email": "john@example.com",
    "membership_type": "PREMIUM"
  }'
```

### Record Gym Entry

```bash
curl -X POST http://localhost:3002/api/v1/members/member123/sessions/entry \
  -H "Content-Type: application/json" \
  -d '{
    "entry_method": "RFID",
    "entry_gate": "Main Entrance"
  }'
```

### Generate AI Workout Plan

```bash
curl -X POST http://localhost:3002/api/v1/members/member123/workout-plans/ai \
  -H "Content-Type: application/json" \
  -d '{
    "goal": "WEIGHT_LOSS",
    "difficulty": "INTERMEDIATE",
    "duration_weeks": 4
  }'
```

## 📊 Analytics & Monitoring

The service provides comprehensive analytics including:

- **Member Analytics**: Growth, retention, and engagement metrics
- **Session Analytics**: Usage patterns and peak hours
- **Equipment Analytics**: Utilization and maintenance insights
- **Health Analytics**: Fitness trends and progress tracking
- **Achievement Analytics**: Gamification effectiveness

## 🔒 Security

- **Rate Limiting**: Prevents abuse with configurable limits
- **CORS**: Configurable cross-origin resource sharing
- **Helmet**: Security headers for protection
- **Input Validation**: Comprehensive request validation
- **Error Handling**: Secure error responses

## 🧪 Testing

```bash
# Run tests
npm test

# Run with coverage
npm run test:coverage

# Run integration tests
npm run test:integration
```

## 📈 Performance

- **Database Optimization**: Efficient queries with proper indexing
- **Caching**: Redis integration for improved performance
- **Connection Pooling**: Optimized database connections
- **Rate Limiting**: Prevents resource exhaustion

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests
5. Submit a pull request

## 📄 License

This project is licensed under the MIT License.

## 🆘 Support

For support and questions:

- Create an issue in the repository
- Contact the development team
- Check the API documentation at `/api/v1/api-docs`

## 🔄 Version History

- **v1.0.0**: Initial release with core features
- **v1.1.0**: Added AI workout plans and advanced analytics
- **v1.2.0**: Enhanced IoT integration and real-time features
