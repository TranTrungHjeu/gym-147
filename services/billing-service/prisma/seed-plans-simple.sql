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
    benefits,
    smart_workout_plans,
    is_active,
    is_featured,
    created_at,
    updated_at
) VALUES (
    'plan_basic_test',
    'Gói Basic',
    'Gói cơ bản - Test 50k/tháng',
    'BASIC',
    1,
    50000.00,
    ARRAY['Sử dụng thiết bị', 'WiFi miễn phí', 'Tủ đồ cá nhân'],
    false,
    true,
    false,
    NOW(),
    NOW()
);

-- 2. GÓI PREMIUM - 100,000 VND/tháng
INSERT INTO membership_plans (
    id, name, description, type, duration_months, price,
    benefits, smart_workout_plans,
    is_active, is_featured,
    created_at, updated_at
) VALUES (
    'plan_premium_test',
    'Gói Premium',
    'Gói phổ biến - Test 100k/tháng',
    'PREMIUM',
    1,
    100000.00,
    ARRAY['Tất cả quyền lợi Basic', 'Lớp học không giới hạn', 'PT sessions', 'Dinh dưỡng'],
    true,
    true,
    true,
    NOW(), NOW()
);

-- 3. GÓI VIP - 150,000 VND/tháng
INSERT INTO membership_plans (
    id, name, description, type, duration_months, price,
    benefits, smart_workout_plans,
    is_active, is_featured,
    created_at, updated_at
) VALUES (
    'plan_vip_test',
    'Gói VIP',
    'Gói cao cấp - Test 150k/tháng',
    'VIP',
    1,
    150000.00,
    ARRAY['Tất cả quyền lợi Premium', 'PT không giới hạn', 'Dinh dưỡng hàng tháng', '24/7 access', 'Phòng VIP'],
    true,
    true,
    false,
    NOW(), NOW()
);

-- 4. GÓI STUDENT - 30,000 VND/tháng
INSERT INTO membership_plans (
    id, name, description, type, duration_months, price,
    benefits, smart_workout_plans,
    is_active, is_featured,
    created_at, updated_at
) VALUES (
    'plan_student_test',
    'Gói Sinh viên',
    'Gói sinh viên - Test 30k/tháng',
    'STUDENT',
    1,
    30000.00,
    ARRAY['Giá ưu đãi sinh viên', 'Sử dụng thiết bị', '4 class credits/tháng'],
    false,
    true,
    false,
    NOW(), NOW()
);

-- Kiểm tra kết quả
SELECT 
    id,
    name,
    type,
    price,
    duration_months,
    is_active,
    is_featured,
    created_at
FROM membership_plans
WHERE id IN ('plan_basic_test', 'plan_premium_test', 'plan_vip_test', 'plan_student_test')
ORDER BY price;

