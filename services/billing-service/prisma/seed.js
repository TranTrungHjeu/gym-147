const {
  PrismaClient,
  PlanType,
  PaymentMethod,
  PaymentStatus,
  SubscriptionStatus,
} = require('@prisma/client');

const prisma = new PrismaClient();

// Helper để log dữ liệu test
function logTestData(data, title) {
  console.log(`\n=== ${title} ===`);
  console.log(JSON.stringify(data, null, 2));
  console.log('='.repeat(60));
}

async function main() {
  console.log('🚀 Bắt đầu tạo seed data cho Billing Service...');

  // Xóa dữ liệu cũ theo đúng thứ tự (foreign key constraints)
  console.log('🗑️  Xóa dữ liệu cũ...');
  await prisma.discountUsage.deleteMany();
  await prisma.invoice.deleteMany();
  await prisma.payment.deleteMany();
  await prisma.subscription.deleteMany();
  await prisma.discountCode.deleteMany();
  await prisma.planAddon.deleteMany();
  await prisma.memberPaymentMethod.deleteMany();
  await prisma.membershipPlan.deleteMany();
  console.log('✅ Đã xóa dữ liệu cũ');

  // 1. Tạo 4 gói thành viên chính: BASIC, PREMIUM, VIP, STUDENT
  console.log('\n💎 Tạo gói thành viên...');
  const basicPlan = await prisma.membershipPlan.create({
    data: {
      name: 'Gói Basic',
      description: 'Gói cơ bản dành cho người mới bắt đầu hành trình tập luyện',
      type: PlanType.BASIC,
      duration_months: 1,
      price: 1000,
      setup_fee: 0,
      benefits: [
        'Sử dụng thiết bị phòng gym',
        'WiFi miễn phí',
        'Tủ đồ cá nhân',
        'Đánh giá thể lực cơ bản',
      ],
      class_credits: 4,
      guest_passes: 0,
      access_hours: { start: '06:00', end: '22:00' },
      access_areas: ['Khu Cardio', 'Khu tạ tự do'],
      equipment_priority: false,
      personal_training_sessions: 0,
      nutritionist_consultations: 0,
      smart_workout_plans: false,
      wearable_integration: false,
      advanced_analytics: false,
      is_active: true,
      is_featured: false,
    },
  });

  const premiumPlan = await prisma.membershipPlan.create({
    data: {
      name: 'Gói Premium',
      description: 'Gói phổ biến nhất với hỗ trợ tập luyện toàn diện',
      type: PlanType.PREMIUM,
      duration_months: 1,
      price: 599000,
      setup_fee: 0,
      benefits: [
        'Tất cả quyền lợi gói Basic',
        'Lớp học nhóm không giới hạn',
        'Tư vấn huấn luyện cá nhân',
        'Hướng dẫn dinh dưỡng',
        'Ưu tiên đặt thiết bị',
        'Thời gian truy cập mở rộng',
      ],
      class_credits: null, // Unlimited
      guest_passes: 2,
      access_hours: { start: '05:00', end: '23:00' },
      access_areas: ['Khu Cardio', 'Khu tạ tự do', 'Functional Training', 'Bể bơi'],
      equipment_priority: true,
      personal_training_sessions: 2,
      nutritionist_consultations: 1,
      smart_workout_plans: true,
      wearable_integration: true,
      advanced_analytics: false,
      is_active: true,
      is_featured: true,
    },
  });

  const vipPlan = await prisma.membershipPlan.create({
    data: {
      name: 'Gói VIP',
      description: 'Trải nghiệm tập luyện cao cấp với các đặc quyền độc quyền',
      type: PlanType.VIP,
      duration_months: 1,
      price: 999000,
      setup_fee: 0,
      benefits: [
        'Tất cả quyền lợi gói Premium',
        'Huấn luyện cá nhân không giới hạn',
        'Tư vấn dinh dưỡng hàng tháng',
        'Phân tích IoT nâng cao',
        'Phòng chờ VIP độc quyền',
        'Truy cập 24/7',
        'Guest passes miễn phí',
        'Ưu tiên đặt lớp học',
      ],
      class_credits: null, // Unlimited
      guest_passes: 5,
      access_hours: { start: '00:00', end: '23:59' },
      access_areas: ['Tất cả khu vực', 'Phòng VIP', 'Spa', 'Sauna'],
      equipment_priority: true,
      personal_training_sessions: 999, // Unlimited (schema không cho null)
      nutritionist_consultations: 4,
      smart_workout_plans: true,
      wearable_integration: true,
      advanced_analytics: true,
      is_active: true,
      is_featured: false,
    },
  });

  const studentPlan = await prisma.membershipPlan.create({
    data: {
      name: 'Gói Sinh viên',
      description: 'Ưu đãi đặc biệt dành cho sinh viên có thẻ hợp lệ',
      type: PlanType.STUDENT,
      duration_months: 1,
      price: 199000,
      setup_fee: 0,
      benefits: [
        'Giá ưu đãi sinh viên',
        'Sử dụng thiết bị phòng gym',
        'Lớp học nhóm (4 credits/tháng)',
        'Môi trường học tập thân thiện',
        'Tủ đồ cá nhân',
      ],
      class_credits: 4,
      guest_passes: 0,
      access_hours: { start: '06:00', end: '22:00' },
      access_areas: ['Khu Cardio', 'Khu tạ tự do'],
      equipment_priority: false,
      personal_training_sessions: 0,
      nutritionist_consultations: 0,
      smart_workout_plans: false,
      wearable_integration: false,
      advanced_analytics: false,
      is_active: true,
      is_featured: false,
      requires_approval: true, // Yêu cầu xác minh sinh viên
    },
  });

  const plans = [basicPlan, premiumPlan, vipPlan, studentPlan];
  console.log(`✅ Đã tạo ${plans.length} gói thành viên`);

  logTestData(
    plans.map(p => ({
      id: p.id,
      name: p.name,
      type: p.type,
      price: p.price.toString(),
      duration_months: p.duration_months,
      is_featured: p.is_featured,
      class_credits: p.class_credits,
      guest_passes: p.guest_passes,
    })),
    'MEMBERSHIP PLANS DATA'
  );

  // 2. Tạo Discount Codes (coupons & referral codes)
  console.log('\n🎫 Tạo mã giảm giá...');
  const discountCodes = [];

  // Coupon giảm giá phần trăm - Dành cho thành viên mới
  discountCodes.push(
    await prisma.discountCode.create({
      data: {
        code: 'WELCOME20',
        name: 'Chào mừng thành viên mới',
        description: 'Giảm 20% cho thành viên mới, tối đa 200k',
        type: 'PERCENTAGE',
        value: 20,
        max_discount: 200000,
        usage_limit: 100,
        usage_count: 15,
        valid_from: new Date('2024-01-01'),
        valid_until: new Date('2025-12-31'),
        minimum_amount: 0,
        applicable_plans: [], // Áp dụng cho tất cả gói (empty array)
        first_time_only: true,
        is_active: true,
      },
    })
  );

  // Coupon giảm giá cố định - Năm mới
  discountCodes.push(
    await prisma.discountCode.create({
      data: {
        code: 'NEWYEAR2024',
        name: 'Khuyến mãi năm mới 2024',
        description: 'Giảm 100k cho đơn hàng từ 299k trở lên',
        type: 'FIXED_AMOUNT',
        value: 100000,
        max_discount: null,
        usage_limit: 50,
        usage_count: 8,
        valid_from: new Date('2024-01-01'),
        valid_until: new Date('2024-02-28'),
        minimum_amount: 299000,
        applicable_plans: [],
        is_active: true,
      },
    })
  );

  // Referral code - Giới thiệu bạn bè
  discountCodes.push(
    await prisma.discountCode.create({
      data: {
        code: 'REF_MINH2024',
        name: 'Mã giới thiệu Minh',
        description: 'Mã giới thiệu từ Minh - Giảm 10%, tối đa 100k',
        type: 'PERCENTAGE',
        value: 10,
        max_discount: 100000,
        usage_limit: null, // Không giới hạn
        usage_count: 23,
        valid_from: new Date('2024-01-01'),
        valid_until: new Date('2025-12-31'),
        minimum_amount: 0,
        applicable_plans: [],
        is_active: true,
      },
    })
  );

  // Premium-only coupon - Áp dụng cho gói Premium & VIP
  discountCodes.push(
    await prisma.discountCode.create({
      data: {
        code: 'PREMIUM30',
        name: 'Ưu đãi gói cao cấp',
        description: 'Giảm 30% cho gói Premium & VIP, tối đa 300k',
        type: 'PERCENTAGE',
        value: 30,
        max_discount: 300000,
        usage_limit: 20,
        usage_count: 5,
        valid_from: new Date('2024-10-01'),
        valid_until: new Date('2024-12-31'),
        minimum_amount: 500000,
        applicable_plans: [premiumPlan.id, vipPlan.id],
        is_active: true,
      },
    })
  );

  // ===== SPECIAL CASE DISCOUNTS (thay thế cho plan types riêng) =====

  // TRIAL - Dùng thử miễn phí 7 ngày (cho BASIC)
  discountCodes.push(
    await prisma.discountCode.create({
      data: {
        code: 'TRIAL7DAYS',
        name: 'Dùng thử miễn phí 7 ngày',
        description: 'Trải nghiệm gói Basic miễn phí 7 ngày cho thành viên mới',
        type: 'FREE_TRIAL',
        value: 100, // 100% discount
        max_discount: null,
        usage_limit: null, // Unlimited
        usage_count: 0,
        usage_limit_per_member: 1, // Chỉ 1 lần/người
        valid_from: new Date('2024-01-01'),
        valid_until: new Date('2025-12-31'),
        minimum_amount: 0,
        applicable_plans: [basicPlan.id],
        first_time_only: true,
        is_active: true,
      },
    })
  );

  // SENIOR - Ưu đãi người cao tuổi (>60 tuổi)
  discountCodes.push(
    await prisma.discountCode.create({
      data: {
        code: 'SENIOR20',
        name: 'Ưu đãi người cao tuổi',
        description: 'Giảm 20% cho thành viên trên 60 tuổi, áp dụng tất cả gói',
        type: 'PERCENTAGE',
        value: 20,
        max_discount: 200000,
        usage_limit: null, // Unlimited
        usage_count: 0,
        valid_from: new Date('2024-01-01'),
        valid_until: new Date('2025-12-31'),
        minimum_amount: 0,
        applicable_plans: [], // Tất cả gói
        is_active: true,
      },
    })
  );

  // FAMILY - Thành viên gia đình thứ 2
  discountCodes.push(
    await prisma.discountCode.create({
      data: {
        code: 'FAMILY_MEMBER_2',
        name: 'Ưu đãi thành viên gia đình thứ 2',
        description: 'Giảm 30% cho thành viên gia đình thứ 2',
        type: 'PERCENTAGE',
        value: 30,
        max_discount: 300000,
        usage_limit: null,
        usage_count: 0,
        valid_from: new Date('2024-01-01'),
        valid_until: new Date('2025-12-31'),
        minimum_amount: 0,
        applicable_plans: [],
        is_active: true,
      },
    })
  );

  // FAMILY - Thành viên gia đình thứ 3+
  discountCodes.push(
    await prisma.discountCode.create({
      data: {
        code: 'FAMILY_MEMBER_3',
        name: 'Ưu đãi thành viên gia đình thứ 3+',
        description: 'Giảm 50% cho thành viên gia đình thứ 3 trở đi',
        type: 'PERCENTAGE',
        value: 50,
        max_discount: 500000,
        usage_limit: null,
        usage_count: 0,
        valid_from: new Date('2024-01-01'),
        valid_until: new Date('2025-12-31'),
        minimum_amount: 0,
        applicable_plans: [],
        is_active: true,
      },
    })
  );

  // CORPORATE - Ưu đãi nhân viên công ty
  discountCodes.push(
    await prisma.discountCode.create({
      data: {
        code: 'CORP_COMPANY_X',
        name: 'Ưu đãi doanh nghiệp - Công ty X',
        description: 'Giảm 25% cho nhân viên Công ty X, tối thiểu gói Premium',
        type: 'PERCENTAGE',
        value: 25,
        max_discount: 250000,
        usage_limit: 100, // Giới hạn 100 nhân viên
        usage_count: 0,
        valid_from: new Date('2024-01-01'),
        valid_until: new Date('2025-12-31'),
        minimum_amount: 599000, // Chỉ Premium trở lên
        applicable_plans: [premiumPlan.id, vipPlan.id],
        is_active: true,
      },
    })
  );

  // REFERRAL with bonus days - Ví dụ mã giới thiệu có thưởng
  discountCodes.push(
    await prisma.discountCode.create({
      data: {
        code: 'REF_VIP_MINH',
        name: 'Mã giới thiệu VIP - Minh',
        description: 'Giảm 15% + tặng 7 ngày + người giới thiệu nhận 100k',
        type: 'PERCENTAGE',
        value: 15,
        max_discount: 150000,
        usage_limit: null,
        usage_count: 0,
        valid_from: new Date('2024-01-01'),
        valid_until: new Date('2025-12-31'),
        minimum_amount: 0,
        applicable_plans: [],
        // Referral fields (NEW!)
        referrer_member_id: 'member_001_nguyen_van_a', // ID của Minh
        bonus_days: 7, // Người được giới thiệu nhận 7 ngày
        referral_reward: 100000, // Minh nhận 100k khi có người dùng mã
        is_active: true,
      },
    })
  );

  console.log(`✅ Đã tạo ${discountCodes.length} mã giảm giá`);

  logTestData(
    discountCodes.map(dc => ({
      code: dc.code,
      name: dc.name,
      type: dc.type,
      value: dc.value.toString(),
      max_discount: dc.max_discount?.toString(),
      usage_count: dc.usage_count,
      usage_limit: dc.usage_limit,
      minimum_amount: dc.minimum_amount?.toString(),
      applicable_plans_count: dc.applicable_plans.length,
      is_active: dc.is_active,
    })),
    'DISCOUNT CODES DATA'
  );

  // ===== TEST DATA: SUBSCRIPTIONS =====
  console.log('\n💰 Tạo test subscriptions...');
  const subscriptions = [];

  // Member IDs từ Member Service seed data
  const testMemberIds = [
    'member_001_nguyen_van_a',
    'member_002_tran_thi_b',
    'member_003_le_van_c',
    'member_004_pham_thi_d',
    'member_005_hoang_van_e',
  ];

  // Test Case 1: ACTIVE subscription (PREMIUM)
  subscriptions.push(
    await prisma.subscription.create({
      data: {
        member_id: testMemberIds[0],
        plan: { connect: { id: premiumPlan.id } },
        status: 'ACTIVE',
        start_date: new Date('2024-10-01'),
        end_date: new Date('2024-11-01'),
        next_billing_date: new Date('2024-11-01'),
        current_period_start: new Date('2024-10-01'),
        current_period_end: new Date('2024-11-01'),
        base_amount: 599000,
        discount_amount: 0,
        total_amount: 599000,
        classes_used: 12,
        classes_remaining: null, // Unlimited
        guest_passes_used: 1,
        pt_sessions_used: 1,
        auto_renew: true,
      },
    })
  );

  // Test Case 2: ACTIVE subscription với discount (BASIC + WELCOME20)
  subscriptions.push(
    await prisma.subscription.create({
      data: {
        member_id: testMemberIds[1],
        plan: { connect: { id: basicPlan.id } },
        status: 'ACTIVE',
        start_date: new Date('2024-10-15'),
        end_date: new Date('2024-11-15'),
        next_billing_date: new Date('2024-11-15'),
        current_period_start: new Date('2024-10-15'),
        current_period_end: new Date('2024-11-15'),
        base_amount: 299000,
        discount_amount: 59800, // 20% discount
        total_amount: 239200,
        classes_used: 2,
        classes_remaining: 2, // 4 total
        guest_passes_used: 0,
        pt_sessions_used: 0,
        auto_renew: true,
      },
    })
  );

  // Test Case 3: TRIAL subscription (VIP)
  subscriptions.push(
    await prisma.subscription.create({
      data: {
        member_id: testMemberIds[2],
        plan: { connect: { id: vipPlan.id } },
        status: 'TRIAL',
        start_date: new Date('2024-10-20'),
        end_date: new Date('2024-11-20'),
        next_billing_date: new Date('2024-10-27'), // 7 days trial
        current_period_start: new Date('2024-10-20'),
        current_period_end: new Date('2024-10-27'),
        base_amount: 999000,
        discount_amount: 999000, // 100% free trial
        total_amount: 0,
        classes_used: 3,
        guest_passes_used: 0,
        pt_sessions_used: 0,
        is_trial: true,
        trial_start: new Date('2024-10-20'),
        trial_end: new Date('2024-10-27'),
        auto_renew: true,
      },
    })
  );

  // Test Case 4: CANCELLED subscription
  subscriptions.push(
    await prisma.subscription.create({
      data: {
        member_id: testMemberIds[3],
        plan: { connect: { id: basicPlan.id } },
        status: 'CANCELLED',
        start_date: new Date('2024-09-01'),
        end_date: new Date('2024-10-01'),
        next_billing_date: new Date('2024-10-01'), // Set to end date for cancelled
        current_period_start: new Date('2024-09-01'),
        current_period_end: new Date('2024-10-01'),
        base_amount: 299000,
        total_amount: 299000,
        classes_used: 4,
        classes_remaining: 0,
        cancelled_at: new Date('2024-09-25'),
        cancellation_reason: 'Chuyển nhà xa',
        cancelled_by: testMemberIds[3],
        auto_renew: false,
      },
    })
  );

  // Test Case 5: PAST_DUE subscription (failed payment)
  subscriptions.push(
    await prisma.subscription.create({
      data: {
        member_id: testMemberIds[4],
        plan: { connect: { id: studentPlan.id } },
        status: 'PAST_DUE',
        start_date: new Date('2024-09-15'),
        end_date: new Date('2024-10-15'),
        next_billing_date: new Date('2024-10-15'),
        current_period_start: new Date('2024-09-15'),
        current_period_end: new Date('2024-10-15'),
        base_amount: 199000,
        total_amount: 199000,
        failed_payments: 2,
        auto_renew: true,
      },
    })
  );

  console.log(`✅ Đã tạo ${subscriptions.length} test subscriptions`);

  // ===== TEST DATA: PAYMENTS =====
  console.log('\n💳 Tạo test payments...');
  const payments = [];

  // Payment 1: COMPLETED - VNPAY (cho subscription 1)
  payments.push(
    await prisma.payment.create({
      data: {
        subscription_id: subscriptions[0].id,
        member_id: testMemberIds[0],
        amount: 599000,
        currency: 'VND',
        status: 'COMPLETED',
        payment_method: 'VNPAY',
        transaction_id: 'VNPAY_' + Date.now(),
        gateway: 'VNPAY',
        gateway_fee: 11980, // 2% fee
        net_amount: 587020,
        payment_type: 'SUBSCRIPTION',
        processed_at: new Date('2024-10-01T10:00:00'),
      },
    })
  );

  // Payment 2: COMPLETED - BANK_TRANSFER với discount (cho subscription 2)
  payments.push(
    await prisma.payment.create({
      data: {
        subscription_id: subscriptions[1].id,
        member_id: testMemberIds[1],
        amount: 239200,
        currency: 'VND',
        status: 'COMPLETED',
        payment_method: 'BANK_TRANSFER',
        payment_type: 'SUBSCRIPTION',
        net_amount: 239200,
        description: 'Thanh toán gói Basic với mã WELCOME20',
        processed_at: new Date('2024-10-15T14:30:00'),
      },
    })
  );

  // Payment 3: PENDING - MOMO (cho subscription 3 - trial chuyển sang trả phí)
  payments.push(
    await prisma.payment.create({
      data: {
        subscription_id: subscriptions[2].id,
        member_id: testMemberIds[2],
        amount: 999000,
        currency: 'VND',
        status: 'PENDING',
        payment_method: 'MOMO',
        payment_type: 'SUBSCRIPTION',
        net_amount: 999000,
        description: 'Trial kết thúc, chuyển sang trả phí',
      },
    })
  );

  // Payment 4: FAILED (cho subscription 5 - PAST_DUE)
  payments.push(
    await prisma.payment.create({
      data: {
        subscription_id: subscriptions[4].id,
        member_id: testMemberIds[4],
        amount: 199000,
        currency: 'VND',
        status: 'FAILED',
        payment_method: 'CREDIT_CARD',
        payment_type: 'SUBSCRIPTION',
        net_amount: 199000,
        failed_at: new Date('2024-10-15T08:00:00'),
        failure_reason: 'Thẻ hết hạn',
        retry_count: 2,
      },
    })
  );

  // Payment 5: REFUNDED (refund cho subscription đã cancel)
  const refundedPayment = await prisma.payment.create({
    data: {
      subscription_id: subscriptions[3].id,
      member_id: testMemberIds[3],
      amount: 299000,
      currency: 'VND',
      status: 'REFUNDED',
      payment_method: 'VNPAY',
      transaction_id: 'VNPAY_REFUND_' + Date.now(),
      gateway: 'VNPAY',
      payment_type: 'SUBSCRIPTION',
      net_amount: 299000,
      processed_at: new Date('2024-09-01T10:00:00'),
      refunded_amount: 149500, // Refund 50% (cancel giữa kỳ)
      refunded_at: new Date('2024-09-25T15:00:00'),
      refund_reason: 'Hủy giữa kỳ',
    },
  });
  payments.push(refundedPayment);

  console.log(`✅ Đã tạo ${payments.length} test payments`);

  // ===== TEST DATA: INVOICES =====
  console.log('\n🧾 Tạo test invoices...');
  const invoices = [];

  // Invoice 1: PAID (cho payment 1)
  invoices.push(
    await prisma.invoice.create({
      data: {
        subscription_id: subscriptions[0].id,
        payment_id: payments[0].id,
        member_id: testMemberIds[0],
        invoice_number: 'INV-2024-10-001',
        status: 'PAID',
        type: 'SUBSCRIPTION',
        subtotal: 599000,
        tax_amount: 0,
        discount_amount: 0,
        total_amount: 599000,
        issued_date: new Date('2024-10-01'),
        due_date: new Date('2024-10-08'),
        paid_date: new Date('2024-10-01'),
        line_items: {
          items: [
            {
              description: 'Gói Premium - Tháng 10/2024',
              quantity: 1,
              unit_price: 599000,
              total: 599000,
            },
          ],
        },
      },
    })
  );

  // Invoice 2: PAID với discount (cho payment 2)
  invoices.push(
    await prisma.invoice.create({
      data: {
        subscription_id: subscriptions[1].id,
        payment_id: payments[1].id,
        member_id: testMemberIds[1],
        invoice_number: 'INV-2024-10-002',
        status: 'PAID',
        type: 'SUBSCRIPTION',
        subtotal: 299000,
        discount_amount: 59800,
        total_amount: 239200,
        issued_date: new Date('2024-10-15'),
        due_date: new Date('2024-10-22'),
        paid_date: new Date('2024-10-15'),
        line_items: {
          items: [
            {
              description: 'Gói Basic - Tháng 10/2024',
              quantity: 1,
              unit_price: 299000,
              total: 299000,
            },
            {
              description: 'Discount: WELCOME20 (-20%)',
              quantity: 1,
              unit_price: -59800,
              total: -59800,
            },
          ],
        },
      },
    })
  );

  // Invoice 3: OVERDUE (cho payment failed)
  invoices.push(
    await prisma.invoice.create({
      data: {
        subscription_id: subscriptions[4].id,
        payment_id: payments[3].id,
        member_id: testMemberIds[4],
        invoice_number: 'INV-2024-10-003',
        status: 'OVERDUE',
        type: 'SUBSCRIPTION',
        subtotal: 199000,
        total_amount: 199000,
        issued_date: new Date('2024-10-08'),
        due_date: new Date('2024-10-15'),
        line_items: {
          items: [
            {
              description: 'Gói Student - Tháng 10/2024',
              quantity: 1,
              unit_price: 199000,
              total: 199000,
            },
          ],
        },
      },
    })
  );

  console.log(`✅ Đã tạo ${invoices.length} test invoices`);

  // ===== TEST DATA: DISCOUNT USAGE =====
  console.log('\n🎁 Tạo discount usage history...');
  const discountUsages = [];

  // Usage 1: WELCOME20 được dùng bởi member 2
  discountUsages.push(
    await prisma.discountUsage.create({
      data: {
        discount_code_id: discountCodes.find(dc => dc.code === 'WELCOME20').id,
        member_id: testMemberIds[1],
        subscription_id: subscriptions[1].id,
        amount_discounted: 59800,
        used_at: new Date('2024-10-15T14:20:00'),
      },
    })
  );

  // Usage 2: REF_VIP_MINH được dùng → referrer nhận thưởng
  const refVipCode = discountCodes.find(dc => dc.code === 'REF_VIP_MINH');
  discountUsages.push(
    await prisma.discountUsage.create({
      data: {
        discount_code_id: refVipCode.id,
        member_id: testMemberIds[2], // Người được giới thiệu
        amount_discounted: 149850, // 15% of 999k
        bonus_days_added: 7,
        referrer_member_id: refVipCode.referrer_member_id, // Người giới thiệu
        referrer_reward: 100000, // Thưởng cho người giới thiệu
        used_at: new Date('2024-10-20T09:00:00'),
      },
    })
  );

  console.log(`✅ Đã tạo ${discountUsages.length} discount usage records`);

  // Update discount code usage counts
  await prisma.discountCode.update({
    where: { code: 'WELCOME20' },
    data: { usage_count: 16 }, // 15 + 1
  });

  await prisma.discountCode.update({
    where: { code: 'REF_VIP_MINH' },
    data: { usage_count: 1 },
  });

  // ===== TEST DATA: SUBSCRIPTION HISTORY =====
  console.log('\n📜 Tạo subscription history (upgrade/downgrade)...');
  const subscriptionHistories = [];

  // History 1: member_001 - upgrade từ BASIC → PREMIUM
  subscriptionHistories.push(
    await prisma.subscriptionHistory.create({
      data: {
        subscription_id: subscriptions[0].id,
        member_id: testMemberIds[0],
        from_plan_id: basicPlan.id,
        to_plan_id: premiumPlan.id,
        from_status: 'ACTIVE',
        to_status: 'ACTIVE',
        old_price: 299000,
        new_price: 599000,
        price_difference: 300000, // Charge thêm
        change_reason: 'UPGRADE',
        changed_by: testMemberIds[0],
        notes: 'Upgrade để sử dụng unlimited classes và PT sessions',
      },
    })
  );

  // History 2: member_001 - renewal (gia hạn)
  subscriptionHistories.push(
    await prisma.subscriptionHistory.create({
      data: {
        subscription_id: subscriptions[0].id,
        member_id: testMemberIds[0],
        from_plan_id: premiumPlan.id,
        to_plan_id: premiumPlan.id,
        from_status: 'ACTIVE',
        to_status: 'ACTIVE',
        old_price: 599000,
        new_price: 599000,
        price_difference: 0,
        change_reason: 'RENEWAL',
        changed_by: 'system',
        notes: 'Gia hạn tự động tháng 11/2024',
      },
    })
  );

  // History 3: member_003 - trial → active (chuyển từ trial sang trả phí)
  subscriptionHistories.push(
    await prisma.subscriptionHistory.create({
      data: {
        subscription_id: subscriptions[2].id,
        member_id: testMemberIds[2],
        from_plan_id: vipPlan.id,
        to_plan_id: vipPlan.id,
        from_status: 'TRIAL',
        to_status: 'ACTIVE',
        old_price: 0, // Trial miễn phí
        new_price: 999000,
        price_difference: 999000,
        change_reason: 'TRIAL_END',
        changed_by: 'system',
        notes: 'Trial kết thúc, chuyển sang gói trả phí',
      },
    })
  );

  // History 4: member_004 - cancellation
  subscriptionHistories.push(
    await prisma.subscriptionHistory.create({
      data: {
        subscription_id: subscriptions[3].id,
        member_id: testMemberIds[3],
        from_plan_id: basicPlan.id,
        to_plan_id: basicPlan.id, // Keep same plan, only status changes
        from_status: 'ACTIVE',
        to_status: 'CANCELLED',
        old_price: 299000,
        new_price: 0,
        price_difference: -149500, // Refund 50%
        change_reason: 'CANCELLATION',
        changed_by: testMemberIds[3],
        notes: 'Hủy do chuyển nhà xa, refund 50% giá trị còn lại',
      },
    })
  );

  // History 5: member_005 - suspension do failed payment
  subscriptionHistories.push(
    await prisma.subscriptionHistory.create({
      data: {
        subscription_id: subscriptions[4].id,
        member_id: testMemberIds[4],
        from_plan_id: studentPlan.id,
        to_plan_id: studentPlan.id,
        from_status: 'ACTIVE',
        to_status: 'PAST_DUE',
        old_price: 199000,
        new_price: 199000,
        price_difference: 0,
        change_reason: 'PAYMENT_FAILED',
        changed_by: 'system',
        notes: 'Chuyển sang PAST_DUE do thanh toán thất bại 2 lần',
      },
    })
  );

  console.log(`✅ Đã tạo ${subscriptionHistories.length} subscription history records`);

  // ===== TEST DATA: MEMBER LIFETIME VALUE =====
  console.log('\n💰 Tạo member lifetime value...');
  const memberLTVs = [];

  // LTV 1: member_001 - High value member (đã upgrade, gia hạn)
  memberLTVs.push(
    await prisma.memberLifetimeValue.create({
      data: {
        member_id: testMemberIds[0],
        total_spent: 1498000, // 299k (basic 1 tháng) + 599k x2 (premium 2 tháng)
        avg_monthly_spend: 499333,
        predicted_ltv: 5992000, // Dự đoán 12 tháng
        subscription_months: 3,
        total_renewals: 1,
        total_upgrades: 1,
        total_downgrades: 0,
        first_payment_date: new Date('2024-08-01'),
        last_payment_date: new Date('2024-10-01'),
        next_expected_payment: new Date('2024-11-01'),
        churn_risk_score: 0.1, // Low risk (10%)
        engagement_score: 0.9, // High engagement (90%)
      },
    })
  );

  // LTV 2: member_002 - New member với discount
  memberLTVs.push(
    await prisma.memberLifetimeValue.create({
      data: {
        member_id: testMemberIds[1],
        total_spent: 239200,
        avg_monthly_spend: 239200,
        predicted_ltv: 2870400, // 12 months (239k x12)
        subscription_months: 1,
        total_renewals: 0,
        total_upgrades: 0,
        total_downgrades: 0,
        first_payment_date: new Date('2024-10-15'),
        last_payment_date: new Date('2024-10-15'),
        next_expected_payment: new Date('2024-11-15'),
        churn_risk_score: 0.3, // Medium risk (30%) - new member
        engagement_score: 0.6, // Medium engagement
      },
    })
  );

  // LTV 3: member_003 - Trial user (chưa trả tiền)
  memberLTVs.push(
    await prisma.memberLifetimeValue.create({
      data: {
        member_id: testMemberIds[2],
        total_spent: 0, // Đang trial
        avg_monthly_spend: 0,
        predicted_ltv: 11988000, // 12 months (999k x12)
        subscription_months: 0,
        total_renewals: 0,
        total_upgrades: 0,
        total_downgrades: 0,
        first_payment_date: null,
        last_payment_date: null,
        next_expected_payment: new Date('2024-10-27'),
        churn_risk_score: 0.5, // Medium-high risk (50%) - trial
        engagement_score: 0.7, // Good engagement
      },
    })
  );

  // LTV 4: member_004 - Churned member
  memberLTVs.push(
    await prisma.memberLifetimeValue.create({
      data: {
        member_id: testMemberIds[3],
        total_spent: 149500, // 299k - refund 149.5k
        avg_monthly_spend: 149500,
        predicted_ltv: 0, // Churned
        subscription_months: 1,
        total_renewals: 0,
        total_upgrades: 0,
        total_downgrades: 0,
        first_payment_date: new Date('2024-09-01'),
        last_payment_date: new Date('2024-09-01'),
        next_expected_payment: null,
        churn_risk_score: 1.0, // Churned (100%)
        engagement_score: 0.0, // No engagement
      },
    })
  );

  // LTV 5: member_005 - At risk member (failed payment)
  memberLTVs.push(
    await prisma.memberLifetimeValue.create({
      data: {
        member_id: testMemberIds[4],
        total_spent: 199000, // 1 tháng đã trả, tháng 2 failed
        avg_monthly_spend: 199000,
        predicted_ltv: 995000, // 5 months (might churn soon)
        subscription_months: 1,
        total_renewals: 0,
        total_upgrades: 0,
        total_downgrades: 0,
        first_payment_date: new Date('2024-09-15'),
        last_payment_date: new Date('2024-09-15'),
        next_expected_payment: new Date('2024-10-15'),
        churn_risk_score: 0.8, // High risk (80%)
        engagement_score: 0.4, // Low engagement
      },
    })
  );

  console.log(`✅ Đã tạo ${memberLTVs.length} member lifetime value records`);

  // ===== TEST DATA: REVENUE REPORTS =====
  console.log('\n📊 Tạo revenue reports...');
  const revenueReports = [];

  // Report 1: 2024-09-01 (tháng 9)
  revenueReports.push(
    await prisma.revenueReport.create({
      data: {
        report_date: new Date('2024-09-01'),
        subscription_revenue: 498000, // member_004 + member_005
        class_revenue: 0,
        addon_revenue: 0,
        other_revenue: 0,
        total_revenue: 498000,
        new_members: 2,
        cancelled_members: 0,
        active_members: 2,
        successful_payments: 2,
        failed_payments: 0,
        refunds_issued: 0,
        refunds_amount: 0,
      },
    })
  );

  // Report 2: 2024-09-25 (ngày cancel + refund)
  revenueReports.push(
    await prisma.revenueReport.create({
      data: {
        report_date: new Date('2024-09-25'),
        subscription_revenue: 0,
        class_revenue: 0,
        addon_revenue: 0,
        other_revenue: 0,
        total_revenue: -149500, // Refund
        new_members: 0,
        cancelled_members: 1,
        active_members: 1,
        successful_payments: 0,
        failed_payments: 0,
        refunds_issued: 1,
        refunds_amount: 149500,
      },
    })
  );

  // Report 3: 2024-10-01 (member_001 renewal)
  revenueReports.push(
    await prisma.revenueReport.create({
      data: {
        report_date: new Date('2024-10-01'),
        subscription_revenue: 599000,
        class_revenue: 0,
        addon_revenue: 0,
        other_revenue: 0,
        total_revenue: 599000,
        new_members: 0,
        cancelled_members: 0,
        active_members: 2,
        successful_payments: 1,
        failed_payments: 0,
        refunds_issued: 0,
        refunds_amount: 0,
      },
    })
  );

  // Report 4: 2024-10-15 (member_002 join + member_005 failed)
  revenueReports.push(
    await prisma.revenueReport.create({
      data: {
        report_date: new Date('2024-10-15'),
        subscription_revenue: 239200,
        class_revenue: 0,
        addon_revenue: 0,
        other_revenue: 0,
        total_revenue: 239200,
        new_members: 1,
        cancelled_members: 0,
        active_members: 3,
        successful_payments: 1,
        failed_payments: 2, // member_005 failed 2 times
        refunds_issued: 0,
        refunds_amount: 0,
      },
    })
  );

  // Report 5: 2024-10-20 (member_003 trial start)
  revenueReports.push(
    await prisma.revenueReport.create({
      data: {
        report_date: new Date('2024-10-20'),
        subscription_revenue: 0, // Trial miễn phí
        class_revenue: 0,
        addon_revenue: 0,
        other_revenue: 0,
        total_revenue: 0,
        new_members: 1,
        cancelled_members: 0,
        active_members: 4,
        successful_payments: 0,
        failed_payments: 0,
        refunds_issued: 0,
        refunds_amount: 0,
      },
    })
  );

  console.log(`✅ Đã tạo ${revenueReports.length} revenue reports`);

  // ===== SUMMARY STATS =====
  const totalRevenue = revenueReports.reduce((sum, r) => sum + Number(r.total_revenue), 0);
  const avgLTV =
    memberLTVs.reduce((sum, ltv) => sum + Number(ltv.predicted_ltv), 0) / memberLTVs.length;
  const activeSubscriptions = subscriptions.filter(
    s => s.status === 'ACTIVE' || s.status === 'TRIAL'
  ).length;

  logTestData(
    {
      summary: {
        total_revenue: totalRevenue,
        avg_predicted_ltv: avgLTV,
        active_subscriptions: activeSubscriptions,
        total_members: testMemberIds.length,
        churn_rate: ((1 / testMemberIds.length) * 100).toFixed(2) + '%',
      },
      revenue_by_date: revenueReports.map(r => ({
        date: r.report_date.toISOString().split('T')[0],
        revenue: Number(r.total_revenue),
        new_members: r.new_members,
        cancelled: r.cancelled_members,
      })),
      member_ltv_summary: memberLTVs.map(ltv => ({
        member_id: ltv.member_id,
        total_spent: Number(ltv.total_spent),
        predicted_ltv: Number(ltv.predicted_ltv),
        churn_risk: ltv.churn_risk_score,
        engagement: ltv.engagement_score,
      })),
    },
    'ANALYTICS SUMMARY'
  );

  console.log('\n🎉 Hoàn thành seed data cho Billing Service!');
  console.log('='.repeat(60));

  console.log('\n📊 TỔNG QUAN DATA:');
  console.log(`   ✅ ${plans.length} Gói thành viên`);
  console.log(`   ✅ ${discountCodes.length} Mã giảm giá`);
  console.log(`   ✅ ${subscriptions.length} Test subscriptions`);
  console.log(`   ✅ ${payments.length} Test payments`);
  console.log(`   ✅ ${invoices.length} Test invoices`);
  console.log(`   ✅ ${discountUsages.length} Discount usage records`);
  console.log(`   ✅ ${subscriptionHistories.length} Subscription history records`);
  console.log(`   ✅ ${memberLTVs.length} Member lifetime value records`);
  console.log(`   ✅ ${revenueReports.length} Revenue reports`);

  console.log('\n💎 GÓI THÀNH VIÊN:');
  console.log('   - BASIC (299k): Cơ bản, 4 class credits/tháng');
  console.log('   - PREMIUM (599k): Phổ biến, unlimited classes, 2 PT sessions ⭐ Featured');
  console.log('   - VIP (999k): Cao cấp, unlimited PT, 24/7 access');
  console.log('   - STUDENT (199k): Sinh viên, yêu cầu xác minh');

  console.log('\n🎫 MÃ GIẢM GIÁ - GENERAL:');
  console.log('   - WELCOME20: Giảm 20% (max 200k) - Thành viên mới');
  console.log('   - NEWYEAR2024: Giảm 100k - Đơn từ 299k');
  console.log('   - REF_MINH2024: Giảm 10% (max 100k) - Mã giới thiệu');
  console.log('   - PREMIUM30: Giảm 30% (max 300k) - Chỉ Premium & VIP');

  console.log('\n🎁 MÃ GIẢM GIÁ - SPECIAL CASES:');
  console.log('   - TRIAL7DAYS: Dùng thử miễn phí 7 ngày gói Basic');
  console.log('   - SENIOR20: Giảm 20% cho người >60 tuổi');
  console.log('   - FAMILY_MEMBER_2: Giảm 30% cho thành viên gia đình thứ 2');
  console.log('   - FAMILY_MEMBER_3: Giảm 50% cho thành viên gia đình thứ 3+');
  console.log('   - CORP_COMPANY_X: Giảm 25% cho nhân viên công ty');

  console.log('\n👥 MÃ GIỚI THIỆU (có bonus):');
  console.log('   - REF_VIP_MINH: Giảm 15% + 7 ngày + người giới thiệu nhận 100k');

  console.log('\n🧪 TEST SUBSCRIPTIONS:');
  console.log('   1. ACTIVE (Premium, 599k) - member_001');
  console.log('   2. ACTIVE (Basic, 239k sau discount) - member_002');
  console.log('   3. TRIAL (VIP, miễn phí 7 ngày) - member_003');
  console.log('   4. CANCELLED (Basic, refund 50%) - member_004');
  console.log('   5. PAST_DUE (Student, failed payment x2) - member_005');

  console.log('\n💳 TEST PAYMENTS:');
  console.log('   1. COMPLETED - VNPAY (599k)');
  console.log('   2. COMPLETED - BANK_TRANSFER (239k với discount)');
  console.log('   3. PENDING - MOMO (999k trial → trả phí)');
  console.log('   4. FAILED - CREDIT_CARD (199k, thẻ hết hạn)');
  console.log('   5. REFUNDED - VNPAY (299k, refund 149.5k)');

  console.log('\n🧾 TEST INVOICES:');
  console.log('   1. PAID - INV-2024-10-001 (599k)');
  console.log('   2. PAID - INV-2024-10-002 (239k với discount)');
  console.log('   3. OVERDUE - INV-2024-10-003 (199k)');

  console.log('\n🎁 DISCOUNT USAGE:');
  console.log('   1. WELCOME20 → -59.8k (member_002)');
  console.log('   2. REF_VIP_MINH → -149.85k + 7 days, referrer +100k (member_003)');

  console.log('\n📜 SUBSCRIPTION HISTORY:');
  console.log('   1. member_001: BASIC → PREMIUM (upgrade +300k)');
  console.log('   2. member_001: PREMIUM renewal (auto)');
  console.log('   3. member_003: TRIAL → ACTIVE (trial end)');
  console.log('   4. member_004: ACTIVE → CANCELLED (refund -149.5k)');
  console.log('   5. member_005: ACTIVE → PAST_DUE (failed payment)');

  console.log('\n💰 MEMBER LIFETIME VALUE:');
  console.log('   1. member_001: Total 1.5M, Predicted 6M (low churn risk)');
  console.log('   2. member_002: Total 239k, Predicted 2.9M (medium risk)');
  console.log('   3. member_003: Total 0, Predicted 12M (trial)');
  console.log('   4. member_004: Total 149k, Predicted 0 (churned)');
  console.log('   5. member_005: Total 199k, Predicted 995k (high churn risk)');

  console.log('\n📊 REVENUE REPORTS:');
  console.log('   - Sep 01: +498k (2 new members)');
  console.log('   - Sep 25: -149.5k (1 refund)');
  console.log('   - Oct 01: +599k (1 renewal)');
  console.log('   - Oct 15: +239k (1 new, 2 failed payments)');
  console.log('   - Oct 20: 0đ (1 trial start)');

  console.log('\n🔗 API ENDPOINTS:');
  console.log('   - GET  /plans/active          - Lấy danh sách gói active');
  console.log('   - POST /validate-coupon       - Validate & apply mã giảm giá');
  console.log('   - GET  /subscriptions         - Lấy danh sách subscriptions');
  console.log('   - GET  /payments              - Lấy danh sách payments');
  console.log('   - GET  /invoices              - Lấy danh sách invoices');

  console.log('\n📝 NOTES:');
  console.log('   - TRIAL, SENIOR, FAMILY, CORPORATE đã được thay thế bằng discount codes');
  console.log('   - DAY_PASS có thể implement qua PlanAddon hoặc one-time Payment');
  console.log('   - Referral system tracking qua DiscountCode + DiscountUsage');
  console.log('   - Test data cover đầy đủ các scenarios: ACTIVE, TRIAL, CANCELLED, PAST_DUE');
  console.log('   - Payment methods: VNPAY, MOMO, BANK_TRANSFER, CREDIT_CARD');
  console.log('   - Payment statuses: COMPLETED, PENDING, FAILED, REFUNDED');
  console.log('   - Subscription history tracking: UPGRADE, RENEWAL, CANCELLATION');
  console.log('   - Member LTV: Churn risk (0.1-1.0), Engagement score (0-1.0)');
  console.log('   - Revenue reports: Daily tracking với refunds');

  console.log('\n💡 BUSINESS INSIGHTS:');
  console.log(`   - Total Revenue (Sep-Oct): ${totalRevenue.toLocaleString('vi-VN')}đ`);
  console.log(`   - Avg Predicted LTV: ${avgLTV.toLocaleString('vi-VN')}đ`);
  console.log(`   - Active Subscriptions: ${activeSubscriptions}/${testMemberIds.length}`);
  console.log(`   - Churn Rate: 20% (1/5 members cancelled)`);
  console.log(`   - Failed Payment Rate: 40% (2 failed attempts)`);

  console.log('\n🚀 Sẵn sàng để test END-TO-END!');
}

main()
  .catch(e => {
    console.error('❌ Lỗi seed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
