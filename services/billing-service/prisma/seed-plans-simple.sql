-- =====================================================
-- SQL Script: Tạo 4 gói thành viên đơn giản (giá rẻ để test)
-- Sử dụng giá trị cố định cho id để dễ test
-- =====================================================

-- Xóa các gói cũ nếu đã tồn tại
DELETE FROM membership_plans WHERE id IN (
    'plan_basic_test',
    'plan_premium_test',
    'plan_vip_test',
    'plan_student_test'
);

-- 1. GÓI BASIC - 50,000 VND/tháng
INSERT INTO membership_plans (
    id,
    name,
    description,
    type,
    duration_months,
    price,
    setup_fee,
    benefits,
    class_credits,
    guest_passes,
    access_hours,
    access_areas,
    equipment_priority,
    personal_training_sessions,
    nutritionist_consultations,
    smart_workout_plans,
    wearable_integration,
    advanced_analytics,
    is_active,
    is_featured,
    requires_approval,
    billing_interval,
    trial_days,
    created_at,
    updated_at
) VALUES (
    'plan_basic_test',
    'Gói Basic',
    'Gói cơ bản - Test 50k/tháng',
    'BASIC',
    1,
    50000.00,
    0.00,
    ARRAY['Sử dụng thiết bị', 'WiFi miễn phí', 'Tủ đồ cá nhân'],
    4,
    0,
    '{"start": "06:00", "end": "22:00"}'::jsonb,
    ARRAY['Khu Cardio', 'Khu tạ tự do'],
    false, 0, 0, false, false, false,
    true, false, false, 'MONTHLY', 0,
    NOW(), NOW()
);

-- 2. GÓI PREMIUM - 100,000 VND/tháng
INSERT INTO membership_plans (
    id, name, description, type, duration_months, price, setup_fee,
    benefits, class_credits, guest_passes, access_hours, access_areas,
    equipment_priority, personal_training_sessions, nutritionist_consultations,
    smart_workout_plans, wearable_integration, advanced_analytics,
    is_active, is_featured, requires_approval, billing_interval, trial_days,
    created_at, updated_at
) VALUES (
    'plan_premium_test',
    'Gói Premium',
    'Gói phổ biến - Test 100k/tháng',
    'PREMIUM',
    1,
    100000.00,
    0.00,
    ARRAY['Tất cả quyền lợi Basic', 'Lớp học không giới hạn', 'PT sessions', 'Dinh dưỡng'],
    NULL, -- Unlimited classes
    2,
    '{"start": "05:00", "end": "23:00"}'::jsonb,
    ARRAY['Khu Cardio', 'Khu tạ', 'Functional Training', 'Bể bơi'],
    true, 2, 1, true, true, false,
    true, true, false, 'MONTHLY', 0,
    NOW(), NOW()
);

-- 3. GÓI VIP - 150,000 VND/tháng
INSERT INTO membership_plans (
    id, name, description, type, duration_months, price, setup_fee,
    benefits, class_credits, guest_passes, access_hours, access_areas,
    equipment_priority, personal_training_sessions, nutritionist_consultations,
    smart_workout_plans, wearable_integration, advanced_analytics,
    is_active, is_featured, requires_approval, billing_interval, trial_days,
    created_at, updated_at
) VALUES (
    'plan_vip_test',
    'Gói VIP',
    'Gói cao cấp - Test 150k/tháng',
    'VIP',
    1,
    150000.00,
    0.00,
    ARRAY['Tất cả quyền lợi Premium', 'PT không giới hạn', 'Dinh dưỡng hàng tháng', '24/7 access', 'Phòng VIP'],
    NULL, -- Unlimited
    5,
    '{"start": "00:00", "end": "23:59"}'::jsonb,
    ARRAY['Tất cả khu vực', 'Phòng VIP', 'Spa', 'Sauna'],
    true, 999, 4, true, true, true, -- 999 = unlimited PT
    true, false, false, 'MONTHLY', 0,
    NOW(), NOW()
);

-- 4. GÓI STUDENT - 30,000 VND/tháng
INSERT INTO membership_plans (
    id, name, description, type, duration_months, price, setup_fee,
    benefits, class_credits, guest_passes, access_hours, access_areas,
    equipment_priority, personal_training_sessions, nutritionist_consultations,
    smart_workout_plans, wearable_integration, advanced_analytics,
    is_active, is_featured, requires_approval, billing_interval, trial_days,
    created_at, updated_at
) VALUES (
    'plan_student_test',
    'Gói Sinh viên',
    'Gói sinh viên - Test 30k/tháng',
    'STUDENT',
    1,
    30000.00,
    0.00,
    ARRAY['Giá ưu đãi sinh viên', 'Sử dụng thiết bị', '4 class credits/tháng'],
    4,
    0,
    '{"start": "06:00", "end": "22:00"}'::jsonb,
    ARRAY['Khu Cardio', 'Khu tạ tự do'],
    false, 0, 0, false, false, false,
    true, false, true, -- requires_approval = true
    'MONTHLY', 0,
    NOW(), NOW()
);

-- Kiểm tra kết quả
SELECT 
    id,
    name,
    type,
    price,
    duration_months,
    class_credits,
    guest_passes,
    is_active,
    is_featured,
    created_at
FROM membership_plans
WHERE id IN ('plan_basic_test', 'plan_premium_test', 'plan_vip_test', 'plan_student_test')
ORDER BY price;

