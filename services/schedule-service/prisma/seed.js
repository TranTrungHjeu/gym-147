// services/schedule-service/prisma/seed.js

const { PrismaClient } = require('@prisma/client');
const {
  TrainerStatus,
  ClassCategory,
  Difficulty,
  RoomStatus,
  ScheduleStatus,
  BookingStatus,
  AttendanceMethod,
  CertificationLevel,
  VerificationStatus,
} = require('@prisma/client');

const prisma = new PrismaClient({
  log: ['query', 'error', 'warn'],
});

// Helper function để log dữ liệu test
function logTestData(data, title) {
  console.log(`\n=== ${title} ===`);
  console.log(JSON.stringify(data, null, 2));
  console.log('='.repeat(50));
}

// Helper function để tạo ngày gần đây
function getRecentDate(daysAgo = 0) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return new Date(today.getTime() - daysAgo * 24 * 60 * 60 * 1000);
}

// Helper function để tạo ngày tương lai
function getFutureDate(daysLater = 0) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return new Date(today.getTime() + daysLater * 24 * 60 * 60 * 1000);
}

async function main() {
  // Note: Using public schema like other services (identity, member, billing)

  console.log('[START] Starting comprehensive seed with test scenarios...');
  console.log('[CLEAN] Cleaning existing data...');

  // Clean data in correct order
  await prisma.attendance.deleteMany({});
  await prisma.booking.deleteMany({});
  await prisma.schedule.deleteMany({});
  await prisma.trainerCertification.deleteMany({});
  await prisma.gymClass.deleteMany({});
  await prisma.room.deleteMany({});
  await prisma.trainer.deleteMany({});
  console.log('[SUCCESS] Existing data cleaned.');

  // Ngày tháng gần đây
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const twoWeeksAgo = getRecentDate(14);
  const threeWeeksLater = getFutureDate(21);

  console.log(
    '[DATE] Sử dụng ngày từ:',
    twoWeeksAgo.toISOString().split('T')[0],
    'đến',
    threeWeeksLater.toISOString().split('T')[0]
  );

  // 1. Tạo 4 trainers (đồng bộ với identity-service)
  console.log('\n👨‍🏫 Creating trainers...');
  const trainersData = [
    {
      user_id: 'trainer_001_nguyen_van_minh',
      full_name: 'Nguyễn Văn Minh',
      phone: '+84901000003',
      email: 'minh.nguyen@gym147.dev',
      specializations: [ClassCategory.YOGA, ClassCategory.PILATES, ClassCategory.RECOVERY],
      bio: 'Chuyên gia Yoga và Pilates với 8 năm kinh nghiệm. Tốt nghiệp chứng chỉ quốc tế Yoga Alliance RYT-500.',
      experience_years: 8,
      hourly_rate: 350000,
      status: TrainerStatus.ACTIVE,
    },
    {
      user_id: 'trainer_002_tran_thi_lan',
      full_name: 'Trần Thị Lan',
      phone: '+84901000004',
      email: 'lan.tran@gym147.dev',
      specializations: [ClassCategory.STRENGTH, ClassCategory.CARDIO, ClassCategory.FUNCTIONAL],
      bio: 'Huấn luyện viên sức mạnh và cardio với 6 năm kinh nghiệm. Chuyên về functional training và HIIT.',
      experience_years: 6,
      hourly_rate: 300000,
      status: TrainerStatus.ACTIVE,
    },
    {
      user_id: 'trainer_003_le_van_hung',
      full_name: 'Lê Văn Hùng',
      phone: '+84901000005',
      email: 'hung.le@gym147.dev',
      specializations: [
        ClassCategory.MARTIAL_ARTS,
        ClassCategory.STRENGTH,
        ClassCategory.FUNCTIONAL,
      ],
      bio: 'Võ sư và huấn luyện viên võ thuật với 10 năm kinh nghiệm. Chuyên về Muay Thai và Boxing.',
      experience_years: 10,
      hourly_rate: 400000,
      status: TrainerStatus.ACTIVE,
    },
    {
      user_id: 'trainer_004_pham_thi_hoa',
      full_name: 'Phạm Thị Hoa',
      phone: '+84901000006',
      email: 'hoa.pham@gym147.dev',
      specializations: [ClassCategory.DANCE, ClassCategory.CARDIO, ClassCategory.AQUA],
      bio: 'Giáo viên dance và cardio với 5 năm kinh nghiệm. Chuyên về Zumba, Aerobic và Aqua Fitness.',
      experience_years: 5,
      hourly_rate: 280000,
      status: TrainerStatus.ACTIVE,
    },
  ];

  const trainers = [];
  for (const trainerData of trainersData) {
    const trainer = await prisma.trainer.create({
      data: {
        ...trainerData,
        rating_average: 0,
        total_classes: 0,
        profile_photo: `https://i.pravatar.cc/150?img=${trainers.length + 1}`,
      },
    });
    trainers.push(trainer);
    console.log(`[SUCCESS] Created trainer: ${trainer.full_name} (${trainer.user_id})`);
  }

  // 2. Tạo certifications cho trainers
  console.log('\n📜 Creating certifications...');
  const certifications = [];

  // Trainer 1 (Minh) - Yoga, Pilates, Recovery
  certifications.push(
    await prisma.trainerCertification.create({
      data: {
        trainer_id: trainers[0].id,
        category: ClassCategory.YOGA,
        certification_name: 'Yoga Alliance RYT-500',
        certification_issuer: 'Yoga Alliance International',
        certification_level: CertificationLevel.EXPERT,
        issued_date: new Date('2020-01-15'),
        expiration_date: new Date('2025-01-15'),
        verification_status: VerificationStatus.VERIFIED,
        verified_by: 'admin',
        verified_at: new Date('2020-01-20'),
        certificate_file_url: 'https://example.com/yoga_expert_cert.pdf',
        certificate_file_type: 'application/pdf',
        is_active: true,
      },
    })
  );
  certifications.push(
    await prisma.trainerCertification.create({
      data: {
        trainer_id: trainers[0].id,
        category: ClassCategory.PILATES,
        certification_name: 'Pilates Method Alliance Comprehensive',
        certification_issuer: 'PMA',
        certification_level: CertificationLevel.ADVANCED,
        issued_date: new Date('2021-03-10'),
        expiration_date: new Date('2026-03-10'),
        verification_status: VerificationStatus.VERIFIED,
        verified_by: 'admin',
        verified_at: new Date('2021-03-15'),
        is_active: true,
      },
    })
  );

  // Trainer 2 (Lan) - Strength, Cardio
  certifications.push(
    await prisma.trainerCertification.create({
      data: {
        trainer_id: trainers[1].id,
        category: ClassCategory.STRENGTH,
        certification_name: 'Certified Strength & Conditioning Specialist',
        certification_issuer: 'NSCA',
        certification_level: CertificationLevel.ADVANCED,
        issued_date: new Date('2022-06-01'),
        expiration_date: new Date('2027-06-01'),
        verification_status: VerificationStatus.VERIFIED,
        verified_by: 'admin',
        verified_at: new Date('2022-06-05'),
        is_active: true,
      },
    })
  );
  certifications.push(
    await prisma.trainerCertification.create({
      data: {
        trainer_id: trainers[1].id,
        category: ClassCategory.CARDIO,
        certification_name: 'HIIT Specialist Certification',
        certification_issuer: 'ACE',
        certification_level: CertificationLevel.INTERMEDIATE,
        issued_date: new Date('2023-01-15'),
        expiration_date: new Date('2028-01-15'),
        verification_status: VerificationStatus.VERIFIED,
        verified_by: 'admin',
        verified_at: new Date('2023-01-20'),
        is_active: true,
      },
    })
  );

  // Trainer 3 (Hùng) - Martial Arts
  certifications.push(
    await prisma.trainerCertification.create({
      data: {
        trainer_id: trainers[2].id,
        category: ClassCategory.MARTIAL_ARTS,
        certification_name: 'Muay Thai Instructor Level 3',
        certification_issuer: 'World Muay Thai Council',
        certification_level: CertificationLevel.EXPERT,
        issued_date: new Date('2019-05-01'),
        expiration_date: new Date('2024-05-01'),
        verification_status: VerificationStatus.VERIFIED,
        verified_by: 'admin',
        verified_at: new Date('2019-05-05'),
        is_active: true,
      },
    })
  );

  // Trainer 4 (Hoa) - Dance, Cardio
  certifications.push(
    await prisma.trainerCertification.create({
      data: {
        trainer_id: trainers[3].id,
        category: ClassCategory.DANCE,
        certification_name: 'Zumba Instructor License',
        certification_issuer: 'Zumba Fitness',
        certification_level: CertificationLevel.INTERMEDIATE,
        issued_date: new Date('2022-08-01'),
        expiration_date: new Date('2027-08-01'),
        verification_status: VerificationStatus.VERIFIED,
        verified_by: 'admin',
        verified_at: new Date('2022-08-05'),
        is_active: true,
      },
    })
  );

  console.log(`[SUCCESS] Created ${certifications.length} certifications`);

  // 3. Tạo gym classes đa dạng (tạo tuần tự để tránh timeout)
  console.log('\n[GYM] Creating diverse gym classes...');
  const classesData = [
    // Yoga classes
    {
      name: 'Hatha Yoga Cơ Bản',
      description: 'Lớp yoga cơ bản cho người mới bắt đầu, tập trung vào hơi thở và tư thế cơ bản',
      category: ClassCategory.YOGA,
      duration: 60,
      max_capacity: 15,
      difficulty: Difficulty.BEGINNER,
      equipment_needed: ['Yoga mat', 'Yoga block'],
      price: 150000,
      thumbnail: 'https://images.unsplash.com/photo-1544367567-0f2fcb009e0b?w=400',
      required_certification_level: CertificationLevel.BASIC,
      is_active: true,
    },
    {
      name: 'Vinyasa Flow Yoga',
      description: 'Lớp yoga động với chuỗi động tác liên tục, phù hợp cho người có kinh nghiệm',
      category: ClassCategory.YOGA,
      duration: 75,
      max_capacity: 12,
      difficulty: Difficulty.INTERMEDIATE,
      equipment_needed: ['Yoga mat', 'Yoga block', 'Yoga strap'],
      price: 200000,
      thumbnail: 'https://images.unsplash.com/photo-1506629905607-0b2b2b2b2b2b?w=400',
      required_certification_level: CertificationLevel.INTERMEDIATE,
      is_active: true,
    },
    // Pilates classes
    {
      name: 'Pilates Core Strength',
      description: 'Tăng cường sức mạnh cơ bụng và cơ lưng với Pilates',
      category: ClassCategory.PILATES,
      duration: 45,
      max_capacity: 10,
      difficulty: Difficulty.INTERMEDIATE,
      equipment_needed: ['Pilates mat', 'Resistance band'],
      price: 180000,
      thumbnail: 'https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=400',
      required_certification_level: CertificationLevel.INTERMEDIATE,
      is_active: true,
    },
    {
      name: 'Pilates All Levels',
      description: 'Lớp Pilates phù hợp với mọi trình độ',
      category: ClassCategory.PILATES,
      duration: 50,
      max_capacity: 12,
      difficulty: Difficulty.ALL_LEVELS,
      equipment_needed: ['Pilates mat'],
      price: 160000,
      thumbnail: 'https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=400',
      required_certification_level: CertificationLevel.BASIC,
      is_active: true,
    },
    // Strength classes
    {
      name: 'Functional Strength Training',
      description: 'Tập luyện sức mạnh chức năng với bodyweight và dụng cụ',
      category: ClassCategory.STRENGTH,
      duration: 60,
      max_capacity: 12,
      difficulty: Difficulty.INTERMEDIATE,
      equipment_needed: ['Dumbbells', 'Kettlebell', 'Resistance bands'],
      price: 220000,
      thumbnail: 'https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=400',
      required_certification_level: CertificationLevel.INTERMEDIATE,
      is_active: true,
    },
    {
      name: 'HIIT Strength',
      description: 'High Intensity Interval Training kết hợp sức mạnh',
      category: ClassCategory.STRENGTH,
      duration: 45,
      max_capacity: 15,
      difficulty: Difficulty.ADVANCED,
      equipment_needed: ['Dumbbells', 'Kettlebell', 'Battle rope'],
      price: 250000,
      thumbnail: 'https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=400',
      required_certification_level: CertificationLevel.ADVANCED,
      is_active: true,
    },
    // Cardio classes
    {
      name: 'Cardio Blast',
      description: 'Lớp cardio cường độ cao để đốt cháy calo',
      category: ClassCategory.CARDIO,
      duration: 45,
      max_capacity: 20,
      difficulty: Difficulty.INTERMEDIATE,
      equipment_needed: ['Jump rope', 'Step platform'],
      price: 180000,
      thumbnail: 'https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=400',
      required_certification_level: CertificationLevel.INTERMEDIATE,
      is_active: true,
    },
    // Dance classes
    {
      name: 'Zumba Fitness',
      description: 'Lớp nhảy Zumba vui nhộn, đốt cháy calo hiệu quả',
      category: ClassCategory.DANCE,
      duration: 60,
      max_capacity: 25,
      difficulty: Difficulty.ALL_LEVELS,
      equipment_needed: [],
      price: 150000,
      thumbnail: 'https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=400',
      required_certification_level: CertificationLevel.BASIC,
      is_active: true,
    },
    // Martial Arts classes
    {
      name: 'Muay Thai Basics',
      description: 'Lớp Muay Thai cơ bản cho người mới bắt đầu',
      category: ClassCategory.MARTIAL_ARTS,
      duration: 60,
      max_capacity: 12,
      difficulty: Difficulty.BEGINNER,
      equipment_needed: ['Boxing gloves', 'Hand wraps', 'Shin guards'],
      price: 200000,
      thumbnail: 'https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=400',
      required_certification_level: CertificationLevel.BASIC,
      is_active: true,
    },
    // Recovery classes
    {
      name: 'Recovery & Stretching',
      description: 'Thư giãn và phục hồi cơ thể sau tập luyện',
      category: ClassCategory.RECOVERY,
      duration: 30,
      max_capacity: 20,
      difficulty: Difficulty.ALL_LEVELS,
      equipment_needed: ['Yoga mat', 'Foam roller'],
      price: 100000,
      thumbnail: 'https://images.unsplash.com/photo-1544367567-0f2fcb009e0b?w=400',
      required_certification_level: CertificationLevel.BASIC,
      is_active: true,
    },
  ];

  // Tạo classes tuần tự để tránh timeout
  const classes = [];
  for (const classData of classesData) {
    const gymClass = await prisma.gymClass.create({
      data: classData,
    });
    classes.push(gymClass);
    console.log(`[SUCCESS] Created class: ${gymClass.name}`);
  }

  console.log(`[SUCCESS] Created ${classes.length} gym classes`);

  // 4. Tạo rooms (tạo tuần tự để tránh timeout)
  console.log('\n🏠 Creating rooms...');
  const roomsData = [
    {
      name: 'Yoga Studio A',
      capacity: 20,
      area_sqm: 80,
      equipment: ['Yoga mats', 'Yoga blocks', 'Yoga straps', 'Bolsters', 'Yoga wheels'],
      amenities: ['Air conditioning', 'Sound system', 'Mirrors', 'Natural lighting'],
      status: RoomStatus.AVAILABLE,
    },
    {
      name: 'Pilates Studio B',
      capacity: 15,
      area_sqm: 60,
      equipment: ['Pilates mats', 'Resistance bands', 'Pilates balls', 'Pilates rings'],
      amenities: ['Air conditioning', 'Sound system', 'Mirrors'],
      status: RoomStatus.AVAILABLE,
    },
    {
      name: 'Strength Training Room C',
      capacity: 12,
      area_sqm: 50,
      equipment: ['Dumbbells', 'Kettlebells', 'Resistance bands', 'TRX', 'Medicine balls'],
      amenities: ['Air conditioning', 'Sound system', 'Mirrors', 'Ventilation'],
      status: RoomStatus.AVAILABLE,
    },
    {
      name: 'Cardio Studio D',
      capacity: 25,
      area_sqm: 100,
      equipment: ['Treadmills', 'Bikes', 'Jump ropes', 'Step platforms'],
      amenities: ['Air conditioning', 'Sound system', 'Mirrors', 'LED lighting'],
      status: RoomStatus.AVAILABLE,
    },
    {
      name: 'Martial Arts Dojo',
      capacity: 15,
      area_sqm: 70,
      equipment: ['Punching bags', 'Pads', 'Mats', 'Gloves'],
      amenities: ['Air conditioning', 'Sound system', 'Mirrors'],
      status: RoomStatus.AVAILABLE,
    },
  ];

  // Tạo rooms tuần tự
  const rooms = [];
  for (const roomData of roomsData) {
    const room = await prisma.room.create({
      data: roomData,
    });
    rooms.push(room);
    console.log(`[SUCCESS] Created room: ${room.name}`);
  }

  console.log(`[SUCCESS] Created ${rooms.length} rooms`);

  // 5. Member IDs (đồng bộ với member-service)
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

  // 6. Tạo schedules với ngày gần đây (2 tuần trước đến 3 tuần sau)
  console.log('\n[DATE] Creating schedules với ngày gần đây...');
  const schedules = [];

  // Test Case 1: Schedules trong quá khứ (COMPLETED) - 14 ngày trước đến 1 ngày trước
  console.log('Creating past schedules (COMPLETED)...');
  // Note: Using public schema like other services

  for (let day = 1; day <= 14; day++) {
    const scheduleDate = getRecentDate(day);

    // Mỗi ngày có 3-5 schedules
    const numSchedules = Math.floor(Math.random() * 3) + 3; // 3-5 schedules/ngày

    for (let i = 0; i < numSchedules; i++) {
      const classIndex = Math.floor(Math.random() * classes.length);
      const gymClass = classes[classIndex];

      // Chọn trainer phù hợp với class category
      let suitableTrainers = trainers.filter(t => t.specializations.includes(gymClass.category));
      if (suitableTrainers.length === 0) {
        // Nếu không có trainer phù hợp, chọn trainer đầu tiên
        suitableTrainers = [trainers[0]];
      }
      const trainer = suitableTrainers[Math.floor(Math.random() * suitableTrainers.length)];

      // Chọn room phù hợp
      const room = rooms[Math.floor(Math.random() * rooms.length)];

      // Giờ bắt đầu: 6h-20h
      const startHour = 6 + Math.floor(Math.random() * 14);
      const startTime = new Date(scheduleDate);
      startTime.setHours(startHour, Math.floor(Math.random() * 60), 0, 0);

      const endTime = new Date(startTime);
      endTime.setMinutes(endTime.getMinutes() + gymClass.duration);

      const currentBookings = Math.floor(Math.random() * (gymClass.max_capacity - 2)) + 2; // 2 đến max-1
      const maxCapacity = gymClass.max_capacity;

      const schedule = await prisma.schedule.create({
        data: {
          class_id: gymClass.id,
          trainer_id: trainer.id, // Đảm bảo 1 lớp chỉ có 1 giáo viên
          room_id: room.id,
          date: scheduleDate,
          start_time: startTime,
          end_time: endTime,
          status: ScheduleStatus.COMPLETED,
          current_bookings: currentBookings,
          max_capacity: maxCapacity,
          waitlist_count: 0,
          price_override: null,
          special_notes: `Lớp hoàn thành ngày ${scheduleDate.toLocaleDateString('vi-VN')}`,
        },
      });
      schedules.push(schedule);
    }
  }

  // Test Case 2: Schedule hôm nay (IN_PROGRESS) - nếu có lớp đang diễn ra
  console.log('Creating today schedule (IN_PROGRESS)...');
  const todaySchedule = await prisma.schedule.create({
    data: {
      class_id: classes[0].id,
      trainer_id: trainers[0].id,
      room_id: rooms[0].id,
      date: today,
      start_time: new Date(today.getFullYear(), today.getMonth(), today.getDate(), 14, 0, 0), // 2PM
      end_time: new Date(today.getFullYear(), today.getMonth(), today.getDate(), 15, 0, 0), // 3PM
      status: ScheduleStatus.IN_PROGRESS,
      current_bookings: 8,
      max_capacity: 15,
      waitlist_count: 2,
      price_override: null,
      special_notes: 'Lớp đang diễn ra hôm nay',
    },
  });
  schedules.push(todaySchedule);

  // Test Case 3: Schedules tương lai (SCHEDULED) - 1-21 ngày tới
  console.log('Creating future schedules (SCHEDULED)...');
  for (let day = 1; day <= 21; day++) {
    const scheduleDate = getFutureDate(day);

    // Mỗi ngày có 2-4 schedules
    const numSchedules = Math.floor(Math.random() * 3) + 2; // 2-4 schedules/ngày

    for (let i = 0; i < numSchedules; i++) {
      const classIndex = Math.floor(Math.random() * classes.length);
      const gymClass = classes[classIndex];

      // Chọn trainer phù hợp với class category
      let suitableTrainers = trainers.filter(t => t.specializations.includes(gymClass.category));
      if (suitableTrainers.length === 0) {
        suitableTrainers = [trainers[0]];
      }
      const trainer = suitableTrainers[Math.floor(Math.random() * suitableTrainers.length)];

      const room = rooms[Math.floor(Math.random() * rooms.length)];

      const startHour = 6 + Math.floor(Math.random() * 14);
      const startTime = new Date(scheduleDate);
      startTime.setHours(startHour, Math.floor(Math.random() * 60), 0, 0);

      const endTime = new Date(startTime);
      endTime.setMinutes(endTime.getMinutes() + gymClass.duration);

      const currentBookings = Math.floor(Math.random() * (gymClass.max_capacity - 1)) + 1; // 1 đến max-1
      const maxCapacity = gymClass.max_capacity;
      const waitlistCount = currentBookings >= maxCapacity ? Math.floor(Math.random() * 5) + 1 : 0;

      const schedule = await prisma.schedule.create({
        data: {
          class_id: gymClass.id,
          trainer_id: trainer.id, // Đảm bảo 1 lớp chỉ có 1 giáo viên
          room_id: room.id,
          date: scheduleDate,
          start_time: startTime,
          end_time: endTime,
          status: ScheduleStatus.SCHEDULED,
          current_bookings: currentBookings,
          max_capacity: maxCapacity,
          waitlist_count: waitlistCount,
          price_override: null,
          special_notes: `Lớp sắp tới ngày ${scheduleDate.toLocaleDateString('vi-VN')}`,
        },
      });
      schedules.push(schedule);
    }
  }

  // Test Case 4: Schedule bị hủy (CANCELLED)
  console.log('Creating cancelled schedule...');
  const cancelledSchedule = await prisma.schedule.create({
    data: {
      class_id: classes[1].id,
      trainer_id: trainers[0].id,
      room_id: rooms[1].id,
      date: getFutureDate(2),
      start_time: new Date(
        getFutureDate(2).getFullYear(),
        getFutureDate(2).getMonth(),
        getFutureDate(2).getDate(),
        16,
        0,
        0
      ),
      end_time: new Date(
        getFutureDate(2).getFullYear(),
        getFutureDate(2).getMonth(),
        getFutureDate(2).getDate(),
        17,
        0,
        0
      ),
      status: ScheduleStatus.CANCELLED,
      current_bookings: 0,
      max_capacity: 12,
      waitlist_count: 0,
      price_override: null,
      special_notes: 'Lớp bị hủy do trainer bị ốm',
    },
  });
  schedules.push(cancelledSchedule);

  console.log(`[SUCCESS] Created ${schedules.length} schedules`);

  // 7. Tạo bookings đa dạng
  console.log('\n[BOOKINGS] Creating diverse bookings...');
  const bookings = [];

  // Bookings cho schedules đã hoàn thành
  const completedSchedules = schedules.filter(s => s.status === 'COMPLETED');
  console.log(`Creating bookings for ${completedSchedules.length} completed schedules`);

  for (let i = 0; i < completedSchedules.length; i++) {
    const schedule = completedSchedules[i];
    const numBookings = schedule.current_bookings;

    // Đảm bảo không có duplicate bookings
    const usedMemberIds = new Set();

    for (let j = 0; j < numBookings; j++) {
      let memberId;
      do {
        memberId = memberIds[Math.floor(Math.random() * memberIds.length)];
      } while (usedMemberIds.has(memberId));
      usedMemberIds.add(memberId);

      const booking = await prisma.booking.create({
        data: {
          schedule_id: schedule.id,
          member_id: memberId,
          status: BookingStatus.COMPLETED,
          booked_at: new Date(
            schedule.start_time.getTime() - (1 + Math.random() * 6) * 24 * 60 * 60 * 1000
          ), // 1-7 ngày trước
          cancelled_at: null,
          cancellation_reason: null,
          payment_status: 'PAID',
          amount_paid:
            schedule.price_override || classes.find(c => c.id === schedule.class_id).price,
          special_needs: j % 3 === 0 ? 'Cần hỗ trợ đặc biệt' : null,
          is_waitlist: false,
          waitlist_position: null,
          notes: `Booking cho schedule ${schedule.id}`,
        },
      });
      bookings.push(booking);
    }
  }

  // Bookings cho schedule hôm nay (IN_PROGRESS)
  console.log(`Creating bookings for today's schedule: ${todaySchedule.id}`);
  for (let j = 0; j < todaySchedule.current_bookings; j++) {
    const memberId = memberIds[j % memberIds.length];

    const booking = await prisma.booking.create({
      data: {
        schedule_id: todaySchedule.id,
        member_id: memberId,
        status: BookingStatus.CONFIRMED,
        booked_at: new Date(today.getTime() - (1 + Math.random() * 6) * 24 * 60 * 60 * 1000), // 1-7 ngày trước
        cancelled_at: null,
        cancellation_reason: null,
        payment_status: 'PAID',
        amount_paid: todaySchedule.price_override || classes[0].price,
        special_needs: null,
        is_waitlist: false,
        waitlist_position: null,
        notes: `Booking cho lớp hôm nay`,
      },
    });
    bookings.push(booking);
  }

  // Bookings cho schedules tương lai (SCHEDULED)
  const futureSchedules = schedules.filter(s => s.status === 'SCHEDULED');
  console.log(`Creating bookings for ${futureSchedules.length} future schedules`);

  for (let i = 0; i < futureSchedules.length; i++) {
    const schedule = futureSchedules[i];
    const numBookings = schedule.current_bookings;

    const usedMemberIds = new Set();

    for (let j = 0; j < numBookings; j++) {
      let memberId;
      do {
        memberId = memberIds[Math.floor(Math.random() * memberIds.length)];
      } while (usedMemberIds.has(memberId));
      usedMemberIds.add(memberId);

      const booking = await prisma.booking.create({
        data: {
          schedule_id: schedule.id,
          member_id: memberId,
          status: BookingStatus.CONFIRMED,
          booked_at: new Date(
            today.getTime() - Math.floor(Math.random() * 7) * 24 * 60 * 60 * 1000
          ),
          cancelled_at: null,
          cancellation_reason: null,
          payment_status: j % 4 === 0 ? 'PENDING' : 'PAID',
          amount_paid:
            schedule.price_override || classes.find(c => c.id === schedule.class_id).price,
          special_needs: null,
          is_waitlist: false,
          waitlist_position: null,
          notes: `Booking cho lớp tương lai ${schedule.id}`,
        },
      });
      bookings.push(booking);
    }
  }

  // Waitlist bookings - chỉ tạo cho schedules đã đầy
  const fullSchedules = schedules.filter(s => s.current_bookings >= s.max_capacity);
  console.log(`Creating waitlist bookings for ${fullSchedules.length} full schedules`);

  for (let i = 0; i < Math.min(5, fullSchedules.length); i++) {
    const schedule = fullSchedules[i];
    const memberId = memberIds[i % memberIds.length];

    // Kiểm tra xem member đã có booking chưa
    const existingBooking = await prisma.booking.findFirst({
      where: {
        schedule_id: schedule.id,
        member_id: memberId,
      },
    });

    if (existingBooking) {
      continue;
    }

    const booking = await prisma.booking.create({
      data: {
        schedule_id: schedule.id,
        member_id: memberId,
        status: BookingStatus.WAITLIST,
        booked_at: new Date(today.getTime() - 1 * 24 * 60 * 60 * 1000),
        cancelled_at: null,
        cancellation_reason: null,
        payment_status: 'PENDING',
        amount_paid: null,
        special_needs: null,
        is_waitlist: true,
        waitlist_position: i + 1,
        notes: `Waitlist position ${i + 1} for schedule ${schedule.id}`,
      },
    });
    bookings.push(booking);
  }

  console.log(`[SUCCESS] Created ${bookings.length} bookings`);

  // 8. Tạo attendance records với ratings đa dạng
  console.log('\n[ATTENDANCE] Creating attendance records...');
  const attendanceRecords = [];

  // Attendance cho schedules đã hoàn thành
  for (let i = 0; i < completedSchedules.length; i++) {
    const schedule = completedSchedules[i];

    // Lấy bookings của schedule này
    const scheduleBookings = bookings.filter(
      b => b.schedule_id === schedule.id && b.status === 'COMPLETED'
    );

    // Tạo attendance cho 60-80% bookings
    const numAttendance = Math.floor(scheduleBookings.length * (0.6 + Math.random() * 0.2));

    for (let j = 0; j < numAttendance; j++) {
      const booking = scheduleBookings[j];

      const checkedInAt = new Date(schedule.start_time);
      checkedInAt.setMinutes(checkedInAt.getMinutes() + Math.floor(Math.random() * 15)); // Trễ 0-15 phút

      const checkedOutAt = new Date(schedule.end_time);
      checkedOutAt.setMinutes(checkedOutAt.getMinutes() - Math.floor(Math.random() * 10)); // Sớm 0-10 phút

      const classRating = Math.floor(Math.random() * 4) + 2; // 2, 3, 4, 5
      const trainerRating = Math.floor(Math.random() * 4) + 2; // 2, 3, 4, 5

      const attendance = await prisma.attendance.create({
        data: {
          schedule_id: schedule.id,
          member_id: booking.member_id,
          checked_in_at: checkedInAt,
          checked_out_at: checkedOutAt,
          attendance_method: AttendanceMethod.MANUAL,
          class_rating: classRating,
          trainer_rating: trainerRating,
          feedback_notes: `Feedback từ member cho lớp ${i + 1}: ${
            classRating >= 4 ? 'Rất hài lòng' : 'Cần cải thiện'
          }`,
        },
      });
      attendanceRecords.push(attendance);
    }
  }

  // Attendance cho schedule hôm nay (IN_PROGRESS)
  const todayBookings = bookings.filter(b => b.schedule_id === todaySchedule.id);
  const todayAttendance = Math.floor(todayBookings.length * 0.7); // 70% đã check-in

  for (let j = 0; j < todayAttendance; j++) {
    const booking = todayBookings[j];

    const checkedInAt = new Date(todaySchedule.start_time);
    checkedInAt.setMinutes(checkedInAt.getMinutes() + Math.floor(Math.random() * 10)); // Trễ 0-10 phút

    const attendance = await prisma.attendance.create({
      data: {
        schedule_id: todaySchedule.id,
        member_id: booking.member_id,
        checked_in_at: checkedInAt,
        checked_out_at: null, // Chưa checkout
        attendance_method: AttendanceMethod.MANUAL,
        class_rating: null, // Chưa rate
        trainer_rating: null,
        feedback_notes: null,
      },
    });
    attendanceRecords.push(attendance);
  }

  console.log(`[SUCCESS] Created ${attendanceRecords.length} attendance records`);

  // 9. Summary
  console.log('\n[CELEBRATE] Comprehensive seed completed successfully!');
  console.log(`[SUCCESS] Created ${trainers.length} trainers`);
  console.log(`[SUCCESS] Created ${certifications.length} certifications`);
  console.log(`[SUCCESS] Created ${classes.length} gym classes`);
  console.log(`[SUCCESS] Created ${rooms.length} rooms`);
  console.log(`[SUCCESS] Created ${schedules.length} schedules`);
  console.log(`[SUCCESS] Created ${bookings.length} bookings`);
  console.log(`[SUCCESS] Created ${attendanceRecords.length} attendance records`);

  // Log test scenarios
  console.log('\n[TEST] TEST SCENARIOS:');
  console.log('='.repeat(60));
  console.log(`Past schedules (COMPLETED): ${completedSchedules.length}`);
  console.log(`Today schedule (IN_PROGRESS): 1`);
  console.log(`Future schedules (SCHEDULED): ${futureSchedules.length}`);
  console.log(`Cancelled schedule: 1`);
  console.log(`\nBookings:`);
  console.log(`  - COMPLETED: ${bookings.filter(b => b.status === 'COMPLETED').length}`);
  console.log(`  - CONFIRMED: ${bookings.filter(b => b.status === 'CONFIRMED').length}`);
  console.log(`  - WAITLIST: ${bookings.filter(b => b.status === 'WAITLIST').length}`);
  console.log(`\nPayment status:`);
  console.log(`  - PAID: ${bookings.filter(b => b.payment_status === 'PAID').length}`);
  console.log(`  - PENDING: ${bookings.filter(b => b.payment_status === 'PENDING').length}`);
  console.log(`\nAttendance:`);
  console.log(`  - With ratings: ${attendanceRecords.filter(a => a.class_rating !== null).length}`);
  console.log(
    `  - Without ratings (in progress): ${
      attendanceRecords.filter(a => a.class_rating === null).length
    }`
  );

  console.log('\n[LINK] Member IDs (đồng bộ với member-service):');
  memberIds.forEach(id => console.log(`   - ${id}`));
  console.log('\n[LINK] Trainer IDs (đồng bộ với identity-service):');
  trainers.forEach(t => console.log(`   - ${t.user_id}`));

  console.log('\n[START] Ready for comprehensive testing!');
}

main()
  .catch(e => {
    console.error('[ERROR] Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
