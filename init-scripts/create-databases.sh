#!/bin/bash
set -e

# Script để tạo multiple databases cho Gym IoT System
echo "🏋️ Creating databases for Gym IoT Management System..."

# Tạo databases riêng cho từng microservice
psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname "$POSTGRES_DB" <<-EOSQL
    -- Tạo database cho Identity Service (Xác thực & Kiểm soát truy cập)
    CREATE DATABASE gym_identity_db;
    GRANT ALL PRIVILEGES ON DATABASE gym_identity_db TO gym_user;
    
    -- Tạo database cho Member Service (Quản lý hội viên & IoT tracking)  
    CREATE DATABASE gym_member_db;
    GRANT ALL PRIVILEGES ON DATABASE gym_member_db TO gym_user;
    
    -- Tạo database cho Schedule Service (Lịch trình & Phòng tập thông minh)
    CREATE DATABASE gym_schedule_db;
    GRANT ALL PRIVILEGES ON DATABASE gym_schedule_db TO gym_user;
    
    -- Tạo database cho Billing Service (Thanh toán & Tài chính)
    CREATE DATABASE gym_billing_db;
    GRANT ALL PRIVILEGES ON DATABASE gym_billing_db TO gym_user;
EOSQL

echo "✅ All databases created successfully!"
echo "📊 Database Summary:"
echo "   🔐 gym_identity_db  - Authentication & Access Control"
echo "   👥 gym_member_db    - Member Management & IoT Tracking" 
echo "   📅 gym_schedule_db  - Smart Scheduling & Room Management"
echo "   💰 gym_billing_db   - Payment Processing & Analytics"