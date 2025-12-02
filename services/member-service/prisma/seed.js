const {
  PrismaClient,
  Gender,
  MembershipStatus,
  MembershipType,
  AccessMethod,
  MetricType,
  Difficulty,
  EquipmentCategory,
  EquipmentStatus,
} = require('@prisma/client');

const prisma = new PrismaClient();

// Helper function to generate random date trong khoảng
function randomDate(start, end) {
  return new Date(start.getTime() + Math.random() * (end.getTime() - start.getTime()));
}

// Helper function để tạo ngày gần đây (2 tuần trước đến 3 tuần sau)
function getRecentDate(daysAgo = 0) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return new Date(today.getTime() - daysAgo * 24 * 60 * 60 * 1000);
}

async function main() {
  console.log('Bắt đầu tạo seed data cho Member Service...');

  // Clear existing data
  console.log('[DELETE]  Xóa dữ liệu cũ...');
  await prisma.maintenanceLog.deleteMany();
  await prisma.equipmentUsage.deleteMany();
  await prisma.equipment.deleteMany();
  await prisma.achievement.deleteMany();
  await prisma.workoutPlan.deleteMany();
  await prisma.healthMetric.deleteMany();
  await prisma.gymSession.deleteMany();
  await prisma.membership.deleteMany();
  await prisma.member.deleteMany();

  // Member IDs từ identity service (đồng bộ)
  const memberIds = [
    'member_001_nguyen_van_a',
    'member_002_tran_thi_b',
    'member_003_le_van_c',
    'member_004_pham_thi_d',
    'member_005_hoang_van_e',
    'member_006_vo_thi_f',
    'member_007_dang_van_g',
    'member_008_bui_thi_h',
    'member_009_ly_van_i',
    'member_010_do_thi_j',
    'member_011_nguyen_thi_k',
    'member_012_tran_van_l',
  ];

  // Dữ liệu member tương ứng
  const membersData = [
    { user_id: 'member_001_nguyen_van_a', full_name: 'Nguyễn Văn A', phone: '0123456789', email: 'nguyenvana@example.com', gender: 'MALE', membership_type: 'PREMIUM' },
    { user_id: 'member_002_tran_thi_b', full_name: 'Trần Thị B', phone: '0123456790', email: 'tranthib@example.com', gender: 'FEMALE', membership_type: 'VIP' },
    { user_id: 'member_003_le_van_c', full_name: 'Lê Văn C', phone: '0123456791', email: 'levanc@example.com', gender: 'MALE', membership_type: 'BASIC' },
    { user_id: 'member_004_pham_thi_d', full_name: 'Phạm Thị D', phone: '0123456792', email: 'phamthid@example.com', gender: 'FEMALE', membership_type: 'PREMIUM' },
    { user_id: 'member_005_hoang_van_e', full_name: 'Hoàng Văn E', phone: '0123456793', email: 'hoangvane@example.com', gender: 'MALE', membership_type: 'VIP' },
    { user_id: 'member_006_vo_thi_f', full_name: 'Võ Thị F', phone: '0123456794', email: 'vothif@example.com', gender: 'FEMALE', membership_type: 'BASIC' },
    { user_id: 'member_007_dang_van_g', full_name: 'Đặng Văn G', phone: '0123456795', email: 'dangvang@example.com', gender: 'MALE', membership_type: 'PREMIUM' },
    { user_id: 'member_008_bui_thi_h', full_name: 'Bùi Thị H', phone: '0123456796', email: 'buithih@example.com', gender: 'FEMALE', membership_type: 'STUDENT' },
    { user_id: 'member_009_ly_van_i', full_name: 'Lý Văn I', phone: '0123456797', email: 'lyvani@example.com', gender: 'MALE', membership_type: 'BASIC' },
    { user_id: 'member_010_do_thi_j', full_name: 'Đỗ Thị J', phone: '0123456798', email: 'dothij@example.com', gender: 'FEMALE', membership_type: 'PREMIUM' },
    { user_id: 'member_011_nguyen_thi_k', full_name: 'Nguyễn Thị K', phone: '0123456799', email: 'nguyenthik@example.com', gender: 'FEMALE', membership_type: 'VIP' },
    { user_id: 'member_012_tran_van_l', full_name: 'Trần Văn L', phone: '0123456800', email: 'tranvanl@example.com', gender: 'MALE', membership_type: 'BASIC' },
  ];

  const fitnessGoals = [
    'Giảm cân',
    'Tăng cơ',
    'Tăng sức bền',
    'Cải thiện sức khỏe',
    'Giảm stress',
    'Tăng sức mạnh',
    'Cải thiện linh hoạt',
    'Chuẩn bị thi đấu',
    'Phục hồi chấn thương',
  ];

  const medicalConditions = [
    'Huyết áp cao',
    'Tiểu đường',
    'Đau lưng',
    'Đau khớp',
    'Hen suyễn',
    'Tim mạch',
  ];

  const allergies = ['Dị ứng thực phẩm', 'Dị ứng thuốc', 'Dị ứng môi trường', 'Không có'];

  // Ngày tháng gần đây
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const twoWeeksAgo = new Date(today);
  twoWeeksAgo.setDate(today.getDate() - 14);
  const threeWeeksLater = new Date(today);
  threeWeeksLater.setDate(today.getDate() + 21);

  console.log('[DATE] Sử dụng ngày từ:', twoWeeksAgo.toISOString().split('T')[0], 'đến', threeWeeksLater.toISOString().split('T')[0]);

  // 1. Tạo Members
  console.log('[MEMBERS] Tạo members...');
  const members = [];
  for (let i = 0; i < membersData.length; i++) {
    const memberData = membersData[i];

    const numGoals = Math.floor(Math.random() * 3) + 1;
    const memberGoals = [];
    for (let j = 0; j < numGoals; j++) {
      memberGoals.push(fitnessGoals[Math.floor(Math.random() * fitnessGoals.length)]);
    }

    const hasMedicalCondition = Math.random() > 0.7;
    const memberMedicalConditions = hasMedicalCondition
      ? [medicalConditions[Math.floor(Math.random() * medicalConditions.length)]]
      : [];

    // Ngày tham gia: 30-90 ngày trước
    const joinedAt = randomDate(new Date(today.getTime() - 90 * 24 * 60 * 60 * 1000), new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000));
    // Hết hạn: 1-3 tháng sau ngày tham gia
    const expiresAt = new Date(joinedAt.getTime() + (30 + Math.random() * 60) * 24 * 60 * 60 * 1000);

    const member = await prisma.member.create({
      data: {
        user_id: memberData.user_id,
        membership_number: `MEM${(i + 1).toString().padStart(4, '0')}`,
        full_name: memberData.full_name,
        phone: memberData.phone,
        email: memberData.email,
        date_of_birth: new Date(1985 + Math.floor(Math.random() * 25), Math.floor(Math.random() * 12), Math.floor(Math.random() * 28) + 1),
        gender: memberData.gender === 'MALE' ? Gender.MALE : Gender.FEMALE,
        address: `Số ${Math.floor(Math.random() * 200) + 1}, Đường ${['Lê Lợi', 'Nguyễn Huệ', 'Trần Hưng Đạo', 'Lý Tự Trọng', 'Pasteur'][Math.floor(Math.random() * 5)]}, Quận ${Math.floor(Math.random() * 12) + 1}, TP.HCM`,
        emergency_contact: `${memberData.full_name.split(' ')[0]} ${memberData.full_name.split(' ')[1]}`,
        emergency_phone: `+8492${Math.floor(Math.random() * 10000000).toString().padStart(7, '0')}`,
        height: 150 + Math.random() * 50, // 150-200 cm
        weight: 45 + Math.random() * 50, // 45-95 kg
        body_fat_percent: 10 + Math.random() * 20, // 10-30%
        fitness_goals: memberGoals,
        medical_conditions: memberMedicalConditions,
        allergies: [allergies[Math.floor(Math.random() * allergies.length)]],
        membership_status: expiresAt > today ? MembershipStatus.ACTIVE : MembershipStatus.EXPIRED,
        membership_type:
          memberData.membership_type === 'BASIC'
            ? MembershipType.BASIC
            : memberData.membership_type === 'PREMIUM'
              ? MembershipType.PREMIUM
              : memberData.membership_type === 'VIP'
                ? MembershipType.VIP
                : MembershipType.STUDENT,
        joined_at: joinedAt,
        expires_at: expiresAt,
        rfid_tag: `RFID${(i + 1).toString().padStart(6, '0')}`,
        qr_code: `QR${(i + 1).toString().padStart(6, '0')}`,
        access_enabled: expiresAt > today,
        onboarding_completed: true,
        onboarding_completed_at: new Date(joinedAt.getTime() + 24 * 60 * 60 * 1000),
        notification_preferences: {
          push: true,
          email: true,
          sms: Math.random() > 0.5,
          in_app: true,
        },
        ai_class_recommendations_enabled: memberData.membership_type === 'PREMIUM' || memberData.membership_type === 'VIP',
        notes: Math.random() > 0.8 ? 'Thành viên VIP, cần chú ý đặc biệt' : null,
      },
    });
    members.push(member);
    console.log(`[SUCCESS] Created member: ${member.full_name} (${member.user_id})`);
  }

  // 2. Tạo Memberships
  console.log('[MEMBERSHIPS] Tạo gói thành viên...');
  for (const member of members) {
    const membershipTypes = [
      MembershipType.BASIC,
      MembershipType.PREMIUM,
      MembershipType.VIP,
      MembershipType.STUDENT,
    ];
    const membershipType = membershipTypes[Math.floor(Math.random() * membershipTypes.length)];

    const prices = {
      [MembershipType.BASIC]: 500000,
      [MembershipType.PREMIUM]: 800000,
      [MembershipType.VIP]: 1200000,
      [MembershipType.STUDENT]: 300000,
    };

    const benefits = {
      [MembershipType.BASIC]: ['Sử dụng thiết bị cơ bản', 'Lớp học nhóm'],
      [MembershipType.PREMIUM]: ['Sử dụng tất cả thiết bị', 'Lớp học nhóm', 'Tư vấn dinh dưỡng'],
      [MembershipType.VIP]: [
        'Sử dụng tất cả thiết bị',
        'Lớp học nhóm',
        'Tư vấn dinh dưỡng',
        'Huấn luyện cá nhân',
      ],
      [MembershipType.STUDENT]: ['Sử dụng thiết bị cơ bản', 'Lớp học nhóm', 'Giá ưu đãi'],
    };

    await prisma.membership.create({
      data: {
        member_id: member.id,
        type: membershipType,
        start_date: member.joined_at,
        end_date: member.expires_at,
        status: member.membership_status,
        price: prices[membershipType],
        benefits: benefits[membershipType],
        notes: `Gói ${membershipType} cho ${member.full_name}`,
      },
    });
  }

  // 3. Tạo Gym Sessions (lịch sử ra vào phòng gym) - 14 ngày gần đây
  console.log('[SESSIONS] Tạo lịch sử ra vào phòng gym (14 ngày gần đây)...');
  for (const member of members.slice(0, 10)) {
    // 10 members có lịch sử
    const numSessions = Math.floor(Math.random() * 20) + 10; // 10-30 sessions

    for (let i = 0; i < numSessions; i++) {
      // Ngày trong 14 ngày gần đây
      const daysAgo = Math.floor(Math.random() * 14);
      const sessionDate = getRecentDate(daysAgo);
      
      // Giờ vào: 6h-21h
      const entryHour = 6 + Math.floor(Math.random() * 15);
      const entryTime = new Date(sessionDate);
      entryTime.setHours(entryHour, Math.floor(Math.random() * 60), 0, 0);
      
      const duration = 60 + Math.random() * 120; // 60-180 phút
      const exitTime = new Date(entryTime.getTime() + duration * 60 * 1000);

      const accessMethods = [
        AccessMethod.RFID,
        AccessMethod.QR_CODE,
        AccessMethod.MANUAL,
      ];
      const entryMethod = accessMethods[Math.floor(Math.random() * accessMethods.length)];
      const exitMethod =
        Math.random() > 0.1
          ? accessMethods[Math.floor(Math.random() * accessMethods.length)]
          : null;

      await prisma.gymSession.create({
        data: {
          member_id: member.id,
          entry_time: entryTime,
          exit_time: Math.random() > 0.05 ? exitTime : null, // 95% có exit time
          duration: Math.random() > 0.05 ? Math.floor(duration) : null,
          entry_method: entryMethod,
          exit_method: exitMethod,
          entry_gate: `CỔNG_${Math.floor(Math.random() * 5) + 1}`,
          exit_gate: Math.random() > 0.05 ? `CỔNG_${Math.floor(Math.random() * 5) + 1}` : null,
          calories_burned: Math.floor(Math.random() * 500) + 100,
          session_rating: Math.floor(Math.random() * 2) + 4, // 4-5 sao
          notes: Math.random() > 0.8 ? 'Buổi tập tốt' : null,
        },
      });
    }
  }

  // 4. Tạo Equipment
  console.log('[EQUIPMENT] Tạo thiết bị...');
  const equipmentData = [
    { name: 'Máy chạy bộ', category: EquipmentCategory.CARDIO, brand: 'Technogym', model: 'Run Artis', location: 'Khu Cardio A' },
    { name: 'Xe đạp tập', category: EquipmentCategory.CARDIO, brand: 'Life Fitness', model: 'IC7', location: 'Khu Cardio B' },
    { name: 'Máy Elliptical', category: EquipmentCategory.CARDIO, brand: 'Precor', model: 'EFX 835', location: 'Khu Cardio C' },
    { name: 'Tạ đòn', category: EquipmentCategory.FREE_WEIGHTS, brand: 'Rogue', model: 'Ohio Bar', location: 'Khu Tạ tự do' },
    { name: 'Tạ tay', category: EquipmentCategory.FREE_WEIGHTS, brand: 'Rogue', model: 'Dumbbells', location: 'Khu Tạ tự do' },
    { name: 'Máy tập ngực', category: EquipmentCategory.STRENGTH, brand: 'Hammer Strength', model: 'Chest Press', location: 'Khu Strength A' },
    { name: 'Máy tập lưng', category: EquipmentCategory.STRENGTH, brand: 'Hammer Strength', model: 'Lat Pulldown', location: 'Khu Strength B' },
    { name: 'Máy tập chân', category: EquipmentCategory.STRENGTH, brand: 'Life Fitness', model: 'Leg Press', location: 'Khu Strength C' },
    { name: 'TRX Suspension', category: EquipmentCategory.FUNCTIONAL, brand: 'TRX', model: 'Suspension Trainer', location: 'Khu Functional' },
    { name: 'Kettlebell', category: EquipmentCategory.FUNCTIONAL, brand: 'Rogue', model: 'Kettlebell', location: 'Khu Functional' },
    { name: 'Thảm Yoga', category: EquipmentCategory.STRETCHING, brand: 'Lululemon', model: 'The Reversible Mat', location: 'Studio Yoga' },
    { name: 'Bóng Stability', category: EquipmentCategory.STRETCHING, brand: 'Gaiam', model: 'Stability Ball', location: 'Studio Pilates' },
    { name: 'Máy massage', category: EquipmentCategory.RECOVERY, brand: 'Hyperice', model: 'Hypervolt', location: 'Khu Recovery' },
    { name: 'Máy đo nhịp tim', category: EquipmentCategory.SPECIALIZED, brand: 'Polar', model: 'H10', location: 'Khu Cardio' },
    { name: 'Máy đo cân nặng', category: EquipmentCategory.SPECIALIZED, brand: 'Tanita', model: 'BC-1000', location: 'Khu Health Check' },
  ];

  const equipment = [];
  for (const equipData of equipmentData) {
    const equip = await prisma.equipment.create({
      data: {
        ...equipData,
        serial_number: `SN${Math.floor(Math.random() * 1000000).toString().padStart(6, '0')}`,
        purchase_date: new Date(Date.now() - Math.random() * 3 * 365 * 24 * 60 * 60 * 1000),
        warranty_until: new Date(Date.now() + Math.random() * 2 * 365 * 24 * 60 * 60 * 1000),
        status: [EquipmentStatus.AVAILABLE, EquipmentStatus.IN_USE, EquipmentStatus.MAINTENANCE][Math.floor(Math.random() * 3)],
        sensor_id: `SENSOR_${Math.floor(Math.random() * 10000).toString().padStart(4, '0')}`,
        last_maintenance: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000),
        next_maintenance: new Date(Date.now() + Math.random() * 30 * 24 * 60 * 60 * 1000),
        usage_hours: Math.floor(Math.random() * 2000) + 100,
        max_weight: equipData.category === EquipmentCategory.FREE_WEIGHTS ? 200 : null,
        has_heart_monitor: equipData.category === EquipmentCategory.CARDIO,
        has_calorie_counter: equipData.category === EquipmentCategory.CARDIO,
        has_rep_counter: equipData.category === EquipmentCategory.STRENGTH,
        wifi_enabled: Math.random() > 0.5,
      },
    });
    equipment.push(equip);
  }

  // 5. Tạo Equipment Usage - 14 ngày gần đây
  console.log('[EQUIPMENT_USAGE] Tạo lịch sử sử dụng thiết bị (14 ngày gần đây)...');
  for (const member of members.slice(0, 8)) {
    // 8 members sử dụng thiết bị
    const numUsages = Math.floor(Math.random() * 15) + 10; // 10-25 usages

    for (let i = 0; i < numUsages; i++) {
      const equip = equipment[Math.floor(Math.random() * equipment.length)];
      
      // Ngày trong 14 ngày gần đây
      const daysAgo = Math.floor(Math.random() * 14);
      const usageDate = getRecentDate(daysAgo);
      
      // Giờ bắt đầu: 6h-21h
      const startHour = 6 + Math.floor(Math.random() * 15);
      const startTime = new Date(usageDate);
      startTime.setHours(startHour, Math.floor(Math.random() * 60), 0, 0);
      
      const duration = 15 + Math.random() * 45; // 15-60 phút
      const endTime = new Date(startTime.getTime() + duration * 60 * 1000);

      await prisma.equipmentUsage.create({
        data: {
          member_id: member.id,
          equipment_id: equip.id,
          start_time: startTime,
          end_time: Math.random() > 0.1 ? endTime : null, // 90% có end time
          duration: Math.random() > 0.1 ? Math.floor(duration) : null,
          calories_burned: Math.floor(Math.random() * 200) + 50,
          sets_completed:
            equip.category === EquipmentCategory.STRENGTH
              ? Math.floor(Math.random() * 5) + 1
              : null,
          weight_used:
            equip.category === EquipmentCategory.STRENGTH
              ? Math.floor(Math.random() * 100) + 10
              : null,
          reps_completed:
            equip.category === EquipmentCategory.STRENGTH
              ? Math.floor(Math.random() * 20) + 5
              : null,
          heart_rate_avg: equip.has_heart_monitor ? Math.floor(Math.random() * 40) + 120 : null,
          heart_rate_max: equip.has_heart_monitor ? Math.floor(Math.random() * 20) + 150 : null,
          sensor_data: equip.has_heart_monitor
            ? {
                heartRate: Math.floor(Math.random() * 40) + 120,
                calories: Math.floor(Math.random() * 200) + 50,
                distance:
                  equip.category === EquipmentCategory.CARDIO
                    ? Math.floor(Math.random() * 5) + 1
                    : null,
              }
            : null,
        },
      });
    }
  }

  // 6. Tạo Health Metrics - 30 ngày gần đây
  console.log('[HEALTH] Tạo chỉ số sức khỏe (30 ngày gần đây)...');
  for (const member of members) {
    const numMetrics = Math.floor(Math.random() * 15) + 8; // 8-23 metrics

    for (let i = 0; i < numMetrics; i++) {
      const metricTypes = [
        MetricType.WEIGHT,
        MetricType.HEIGHT,
        MetricType.BODY_FAT,
        MetricType.MUSCLE_MASS,
        MetricType.BMI,
        MetricType.HEART_RATE,
      ];
      const metricType = metricTypes[Math.floor(Math.random() * metricTypes.length)];

      let value, unit;
      switch (metricType) {
        case MetricType.WEIGHT:
          value = 45 + Math.random() * 50;
          unit = 'kg';
          break;
        case MetricType.HEIGHT:
          value = 150 + Math.random() * 50;
          unit = 'cm';
          break;
        case MetricType.BODY_FAT:
          value = 10 + Math.random() * 20;
          unit = '%';
          break;
        case MetricType.MUSCLE_MASS:
          value = 20 + Math.random() * 30;
          unit = 'kg';
          break;
        case MetricType.BMI:
          value = 18 + Math.random() * 10;
          unit = 'kg/m²';
          break;
        case MetricType.HEART_RATE:
          value = 60 + Math.random() * 40;
          unit = 'bpm';
          break;
      }

      // Ngày trong 30 ngày gần đây
      const daysAgo = Math.floor(Math.random() * 30);
      const recordedAt = getRecentDate(daysAgo);

      await prisma.healthMetric.create({
        data: {
          member_id: member.id,
          metric_type: metricType,
          value: value,
          unit: unit,
          recorded_at: recordedAt,
          source: ['MANUAL', 'SCALE', 'WEARABLE', 'ASSESSMENT'][Math.floor(Math.random() * 4)],
          notes: Math.random() > 0.8 ? 'Đo tại phòng gym' : null,
        },
      });
    }
  }

  // 7. Tạo Workout Plans
  console.log('[WORKOUT] Tạo kế hoạch tập luyện...');
  for (const member of members.slice(0, 8)) {
    // 8 members có workout plans
    const numPlans = Math.floor(Math.random() * 2) + 1; // 1-2 plans

    for (let j = 0; j < numPlans; j++) {
      const goals = ['WEIGHT_LOSS', 'MUSCLE_GAIN', 'CARDIO', 'STRENGTH', 'GENERAL_FITNESS'];
      const goal = goals[Math.floor(Math.random() * goals.length)];

      const exercises = {
        WEIGHT_LOSS: [
          { name: 'Chạy bộ', sets: 1, reps: '30 phút', rest: '0' },
          { name: 'Burpees', sets: 3, reps: 15, rest: '60s' },
          { name: 'Mountain Climbers', sets: 3, reps: 20, rest: '45s' },
        ],
        MUSCLE_GAIN: [
          { name: 'Bench Press', sets: 4, reps: 8, rest: '2 phút' },
          { name: 'Squats', sets: 4, reps: 10, rest: '2 phút' },
          { name: 'Deadlifts', sets: 3, reps: 6, rest: '3 phút' },
        ],
        CARDIO: [
          { name: 'HIIT Cardio', sets: 1, reps: '20 phút', rest: '0' },
          { name: 'Jumping Jacks', sets: 3, reps: 30, rest: '30s' },
        ],
        STRENGTH: [
          { name: 'Push-ups', sets: 3, reps: 15, rest: '1 phút' },
          { name: 'Pull-ups', sets: 3, reps: 8, rest: '2 phút' },
          { name: 'Plank', sets: 3, reps: '60s', rest: '1 phút' },
        ],
        GENERAL_FITNESS: [
          { name: 'Yoga Flow', sets: 1, reps: '45 phút', rest: '0' },
          { name: 'Bodyweight Circuit', sets: 2, reps: '15 phút', rest: '5 phút' },
        ],
      };

      await prisma.workoutPlan.create({
        data: {
          member_id: member.id,
          name: `Kế hoạch ${goal} - Tuần ${j + 1}`,
          description: `Kế hoạch tập luyện ${goal} được thiết kế riêng cho ${member.full_name}`,
          difficulty: [Difficulty.BEGINNER, Difficulty.INTERMEDIATE, Difficulty.ADVANCED][
            Math.floor(Math.random() * 3)
          ],
          duration_weeks: Math.floor(Math.random() * 8) + 4, // 4-12 tuần
          goal: goal,
          exercises: exercises[goal],
          is_active: j === 0, // Chỉ plan đầu tiên active
          ai_generated: Math.random() > 0.5,
          created_by: Math.random() > 0.7 ? `trainer_${Math.floor(Math.random() * 4) + 1}` : null,
        },
      });
    }
  }

  // 8. Tạo Achievements
  console.log('[ACHIEVEMENTS] Tạo thành tích...');
  const achievementTemplates = [
    {
      title: 'Người mới bắt đầu',
      description: 'Hoàn thành buổi tập đầu tiên',
      category: 'FITNESS',
      points: 10,
    },
    {
      title: 'Kiên trì',
      description: 'Tập luyện 7 ngày liên tiếp',
      category: 'ATTENDANCE',
      points: 50,
    },
    {
      title: 'Marathon',
      description: 'Chạy 42km trong một tháng',
      category: 'FITNESS',
      points: 100,
    },
    { title: 'Sức mạnh', description: 'Nâng tạ 100kg', category: 'FITNESS', points: 75 },
    { title: 'Thành viên VIP', description: 'Sử dụng dịch vụ VIP', category: 'SOCIAL', points: 25 },
    {
      title: 'Chuyên gia',
      description: 'Hoàn thành 100 buổi tập',
      category: 'FITNESS',
      points: 200,
    },
  ];

  for (const member of members.slice(0, 8)) {
    // 8 members có achievements
    const numAchievements = Math.floor(Math.random() * 4) + 1; // 1-4 achievements

    for (let i = 0; i < numAchievements; i++) {
      const template =
        achievementTemplates[Math.floor(Math.random() * achievementTemplates.length)];

      // Ngày unlock: 30-90 ngày trước
      const unlockedAt = randomDate(new Date(today.getTime() - 90 * 24 * 60 * 60 * 1000), new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000));

      await prisma.achievement.create({
        data: {
          member_id: member.id,
          title: template.title,
          description: template.description,
          category: template.category,
          points: template.points,
          badge_icon: `badge_${template.category.toLowerCase()}.png`,
          unlocked_at: unlockedAt,
        },
      });
    }
  }

  // 9. Tạo Maintenance Logs
  console.log('[MAINTENANCE] Tạo lịch sử bảo trì...');
  for (const equip of equipment) {
    const numMaintenances = Math.floor(Math.random() * 3) + 1; // 1-3 maintenances

    for (let i = 0; i < numMaintenances; i++) {
      const maintenanceTypes = ['ROUTINE', 'REPAIR', 'CALIBRATION'];
      const type = maintenanceTypes[Math.floor(Math.random() * maintenanceTypes.length)];

      // Ngày bảo trì: 7-30 ngày trước
      const daysAgo = 7 + Math.floor(Math.random() * 23);
      const completedAt = getRecentDate(daysAgo);

      await prisma.maintenanceLog.create({
        data: {
          equipment_id: equip.id,
          maintenance_type: type,
          description: `Bảo trì ${type.toLowerCase()} cho ${equip.name}`,
          performed_by: `staff_${Math.floor(Math.random() * 10) + 1}`,
          cost: Math.floor(Math.random() * 500000) + 100000,
          parts_replaced: Math.random() > 0.5 ? ['Bộ phận A', 'Bộ phận B'] : [],
          next_due: new Date(completedAt.getTime() + (30 + Math.random() * 60) * 24 * 60 * 60 * 1000),
          completed_at: completedAt,
        },
      });
    }
  }

  console.log('\n[CELEBRATE] Hoàn thành seed data cho Member Service!');
  console.log(`[STATS]   - ${members.length} Thành viên`);
  console.log(`[STATS]   - ${members.length} Gói thành viên`);
  console.log(`[STATS]   - Lịch sử ra vào cho 10 thành viên (14 ngày gần đây)`);
  console.log(`[STATS]   - ${equipment.length} Thiết bị`);
  console.log(`[STATS]   - Lịch sử sử dụng thiết bị cho 8 thành viên (14 ngày gần đây)`);
  console.log(`[STATS]   - Chỉ số sức khỏe cho tất cả thành viên (30 ngày gần đây)`);
  console.log(`[STATS]   - Kế hoạch tập luyện cho 8 thành viên`);
  console.log(`[STATS]   - Thành tích cho 8 thành viên`);
  console.log(`[STATS]   - Lịch sử bảo trì thiết bị`);
  console.log('\n[LINK] Member IDs phù hợp với Identity & Schedule Service:');
  memberIds.forEach(id => console.log(`   - ${id}`));
}

main()
  .catch(e => {
    console.error('Lỗi seed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
