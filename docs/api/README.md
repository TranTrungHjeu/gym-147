# 🏋️ Gym Management System - API Documentation

## Overview
This document provides comprehensive API documentation for all microservices in the Gym Management System.

## Base URL
- **Development**: `http://localhost:8080/api`
- **Production**: `https://your-domain.com/api`

## Authentication
All protected endpoints require a Bearer token in the Authorization header:
```
Authorization: Bearer <your-jwt-token>
```

## Services

### 1. Identity Service (Port 3001)
Handles user authentication and authorization.

#### Endpoints
- `POST /auth/login` - User login
- `POST /auth/register` - User registration  
- `POST /auth/refresh` - Refresh access token
- `POST /auth/logout` - User logout
- `GET /auth/profile` - Get user profile
- `PUT /auth/profile` - Update user profile

### 2. Member Service (Port 3002)
Manages gym members and their information.

#### Endpoints
- `GET /members` - Get all members (with pagination)
- `GET /members/:id` - Get member by ID
- `POST /members` - Create new member
- `PUT /members/:id` - Update member
- `DELETE /members/:id` - Delete member
- `GET /members/stats` - Get member statistics

### 3. Schedule Service (Port 3003)
Manages gym classes, schedules, and bookings.

#### Endpoints
- `GET /classes` - Get all classes
- `GET /classes/:id` - Get class by ID
- `POST /classes` - Create new class
- `PUT /classes/:id` - Update class
- `DELETE /classes/:id` - Delete class
- `GET /schedules` - Get class schedules
- `POST /bookings` - Book a class
- `GET /stats` - Get schedule statistics

### 4. Billing Service (Port 3004)
Handles membership plans, subscriptions, and payments.

#### Endpoints
- `GET /plans` - Get all membership plans
- `GET /plans/:id` - Get plan by ID
- `POST /plans` - Create new plan
- `PUT /plans/:id` - Update plan
- `DELETE /plans/:id` - Delete plan
- `GET /subscriptions` - Get subscriptions
- `POST /subscriptions` - Create subscription
- `GET /payments` - Get payments
- `POST /payments` - Process payment
- `GET /stats` - Get billing statistics

## Response Format
All API responses follow this standard format:

### Success Response
```json
{
  "success": true,
  "message": "Operation completed successfully",
  "data": {
    // Response data
  },
  "meta": {
    // Pagination info (for list endpoints)
    "page": 1,
    "limit": 20,
    "total": 100,
    "totalPages": 5
  }
}
```

### Error Response
```json
{
  "success": false,
  "message": "Error description",
  "code": "ERROR_CODE",
  "errors": [
    // Validation errors (if applicable)
  ]
}
```

## Status Codes
- `200` - Success
- `201` - Created
- `400` - Bad Request
- `401` - Unauthorized
- `403` - Forbidden
- `404` - Not Found
- `422` - Validation Error
- `500` - Internal Server Error

## Rate Limiting
- **Default**: 100 requests per 15 minutes
- **Billing Service**: 100 requests per minute (burst: 50)

## Pagination
List endpoints support pagination with these query parameters:
- `page` - Page number (default: 1)
- `limit` - Items per page (default: 20, max: 100)
- `sort` - Sort field
- `order` - Sort direction (`asc` or `desc`)

Example: `GET /members?page=2&limit=10&sort=createdAt&order=desc`