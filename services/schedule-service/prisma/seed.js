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

const prisma = new PrismaClient();

// Helper function để log dữ liệu test
function logTestData(data, title) {
  console.log(`\n=== ${title} ===`);
  console.log(JSON.stringify(data, null, 2));
  console.log('='.repeat(50));
}

async function main() {
  console.log('🚀 Starting comprehensive seed with test scenarios...');
  console.log('🧹 Cleaning existing data...');

  // Clean data in correct order
  await prisma.attendance.deleteMany({});
  await prisma.booking.deleteMany({});
  await prisma.schedule.deleteMany({});
  await prisma.trainerCertification.deleteMany({});
  await prisma.gymClass.deleteMany({});
  await prisma.room.deleteMany({});
  await prisma.trainer.deleteMany({});
  console.log('✅ Existing data cleaned.');

  // 1. Tạo trainer chính với đầy đủ thông tin
  console.log('\n👨‍🏫 Creating main trainer...');
  const trainer = await prisma.trainer.create({
    data: {
      user_id: 'trainer_nguyen_van_minh_001',
      full_name: 'Nguyễn Văn Minh',
      phone: '+84901000003',
      email: 'minh.nguyen@gym147.dev',
      specializations: ['YOGA', 'PILATES', 'RECOVERY', 'STRENGTH'],
      bio: 'Chuyên gia Yoga và Pilates với 8 năm kinh nghiệm. Tốt nghiệp chứng chỉ quốc tế Yoga Alliance RYT-500.',
      experience_years: 8,
      hourly_rate: 350000,
      status: TrainerStatus.ACTIVE,
      rating_average: 0,
      total_classes: 0,
      profile_photo: 'https://i.pravatar.cc/150?img=1',
    },
  });

  logTestData(
    {
      trainer_id: trainer.id,
      user_id: trainer.user_id,
      full_name: trainer.full_name,
      email: trainer.email,
      specializations: trainer.specializations,
      status: trainer.status,
      hourly_rate: trainer.hourly_rate,
    },
    'MAIN TRAINER DATA FOR TESTING'
  );

  // 2. Tạo certifications đa dạng cho trainer
  console.log('\n📜 Creating comprehensive certifications...');
  const certifications = await Promise.all([
    // Yoga certifications - từ Basic đến Expert
    prisma.trainerCertification.create({
      data: {
        trainer_id: trainer.id,
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
    }),
    // Pilates certification
    prisma.trainerCertification.create({
      data: {
        trainer_id: trainer.id,
        category: ClassCategory.PILATES,
        certification_name: 'Pilates Method Alliance Comprehensive',
        certification_issuer: 'PMA',
        certification_level: CertificationLevel.ADVANCED,
        issued_date: new Date('2021-03-10'),
        expiration_date: new Date('2026-03-10'),
        verification_status: VerificationStatus.VERIFIED,
        verified_by: 'admin',
        verified_at: new Date('2021-03-15'),
        certificate_file_url: 'https://example.com/pilates_advanced_cert.pdf',
        certificate_file_type: 'application/pdf',
        is_active: true,
      },
    }),
    // Recovery certification
    prisma.trainerCertification.create({
      data: {
        trainer_id: trainer.id,
        category: ClassCategory.RECOVERY,
        certification_name: 'Sports Recovery Specialist',
        certification_issuer: 'National Academy of Sports Medicine',
        certification_level: CertificationLevel.INTERMEDIATE,
        issued_date: new Date('2022-06-01'),
        expiration_date: new Date('2027-06-01'),
        verification_status: VerificationStatus.VERIFIED,
        verified_by: 'admin',
        verified_at: new Date('2022-06-05'),
        certificate_file_url: 'https://example.com/recovery_cert.pdf',
        certificate_file_type: 'application/pdf',
        is_active: true,
      },
    }),
    // Strength certification
    prisma.trainerCertification.create({
      data: {
        trainer_id: trainer.id,
        category: ClassCategory.STRENGTH,
        certification_name: 'Certified Strength & Conditioning Specialist',
        certification_issuer: 'NSCA',
        certification_level: CertificationLevel.ADVANCED,
        issued_date: new Date('2023-01-15'),
        expiration_date: new Date('2028-01-15'),
        verification_status: VerificationStatus.VERIFIED,
        verified_by: 'admin',
        verified_at: new Date('2023-01-20'),
        certificate_file_url: 'https://example.com/strength_cert.pdf',
        certificate_file_type: 'application/pdf',
        is_active: true,
      },
    }),
  ]);

  logTestData(
    certifications.map(cert => ({
      id: cert.id,
      trainer_id: cert.trainer_id,
      category: cert.category,
      certification_level: cert.certification_level,
      verification_status: cert.verification_status,
      expiration_date: cert.expiration_date,
      is_active: cert.is_active,
    })),
    'CERTIFICATIONS DATA FOR TESTING'
  );

  // 3. Tạo gym classes đa dạng cho test cases
  console.log('\n🏋️ Creating diverse gym classes...');
  const classes = await Promise.all([
    // Yoga classes - các level khác nhau
    prisma.gymClass.create({
      data: {
        name: 'Hatha Yoga Cơ Bản',
        description:
          'Lớp yoga cơ bản cho người mới bắt đầu, tập trung vào hơi thở và tư thế cơ bản',
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
    }),
    prisma.gymClass.create({
      data: {
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
    }),
    prisma.gymClass.create({
      data: {
        name: 'Advanced Yoga Workshop',
        description: 'Workshop yoga nâng cao với các tư thế khó và kỹ thuật đặc biệt',
        category: ClassCategory.YOGA,
        duration: 90,
        max_capacity: 8,
        difficulty: Difficulty.ADVANCED,
        equipment_needed: ['Yoga mat', 'Yoga block', 'Yoga strap', 'Yoga wheel'],
        price: 300000,
        thumbnail: 'https://images.unsplash.com/photo-1506629905607-0b2b2b2b2b2b?w=400',
        required_certification_level: CertificationLevel.ADVANCED,
        is_active: true,
      },
    }),
    // Pilates classes
    prisma.gymClass.create({
      data: {
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
    }),
    prisma.gymClass.create({
      data: {
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
    }),
    // Recovery classes
    prisma.gymClass.create({
      data: {
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
    }),
    // Strength classes
    prisma.gymClass.create({
      data: {
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
    }),
  ]);

  logTestData(
    classes.map(cls => ({
      id: cls.id,
      name: cls.name,
      category: cls.category,
      difficulty: cls.difficulty,
      max_capacity: cls.max_capacity,
      price: cls.price,
      required_certification_level: cls.required_certification_level,
      duration: cls.duration,
    })),
    'GYM CLASSES DATA FOR TESTING'
  );

  // 4. Tạo rooms đa dạng
  console.log('\n🏠 Creating diverse rooms...');
  const rooms = await Promise.all([
    prisma.room.create({
      data: {
        name: 'Yoga Studio A',
        capacity: 20,
        area_sqm: 80,
        equipment: ['Yoga mats', 'Yoga blocks', 'Yoga straps', 'Bolsters', 'Yoga wheels'],
        amenities: ['Air conditioning', 'Sound system', 'Mirrors', 'Natural lighting'],
        status: RoomStatus.AVAILABLE,
      },
    }),
    prisma.room.create({
      data: {
        name: 'Pilates Studio B',
        capacity: 15,
        area_sqm: 60,
        equipment: ['Pilates mats', 'Resistance bands', 'Pilates balls', 'Pilates rings'],
        amenities: ['Air conditioning', 'Sound system', 'Mirrors'],
        status: RoomStatus.AVAILABLE,
      },
    }),
    prisma.room.create({
      data: {
        name: 'Strength Training Room C',
        capacity: 12,
        area_sqm: 50,
        equipment: ['Dumbbells', 'Kettlebells', 'Resistance bands', 'TRX', 'Medicine balls'],
        amenities: ['Air conditioning', 'Sound system', 'Mirrors', 'Ventilation'],
        status: RoomStatus.AVAILABLE,
      },
    }),
    prisma.room.create({
      data: {
        name: 'Recovery Room D',
        capacity: 25,
        area_sqm: 100,
        equipment: ['Yoga mats', 'Foam rollers', 'Massage balls', 'Stretching straps'],
        amenities: ['Air conditioning', 'Soft lighting', 'Calming music'],
        status: RoomStatus.AVAILABLE,
      },
    }),
  ]);

  logTestData(
    rooms.map(room => ({
      id: room.id,
      name: room.name,
      capacity: room.capacity,
      status: room.status,
      equipment: room.equipment,
      amenities: room.amenities,
    })),
    'ROOMS DATA FOR TESTING'
  );

  // 5. Tạo members đa dạng cho test cases - ĐỒNG BỘ VỚI MEMBER SERVICE
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
  ];

  logTestData(
    {
      member_ids: memberIds,
      total_members: memberIds.length,
      note: 'These are test member IDs for booking scenarios',
    },
    'MEMBER IDS FOR TESTING'
  );

  // 6. Tạo schedules với ngày tháng cụ thể cho test cases
  console.log('\n📅 Creating schedules with specific dates for testing...');
  const schedules = [];

  // Ngày hiện tại để tính toán
  const today = new Date();
  const todayStr = today.toISOString().split('T')[0];

  // Test Case 1: Schedules trong quá khứ (COMPLETED) - 7 ngày trước đến 1 ngày trước
  console.log('Creating past schedules (COMPLETED)...');
  for (let i = 1; i <= 7; i++) {
    const scheduleDate = new Date(today);
    scheduleDate.setDate(today.getDate() - i);

    const startTime = new Date(scheduleDate);
    startTime.setHours(9 + (i % 3), 0, 0, 0); // 9h, 10h, 11h

    const endTime = new Date(startTime);
    endTime.setMinutes(endTime.getMinutes() + classes[i % classes.length].duration);

    const currentBookings = Math.floor(Math.random() * 8) + 5; // 5-12 bookings
    const maxCapacity = classes[i % classes.length].max_capacity;

    const schedule = await prisma.schedule.create({
      data: {
        class_id: classes[i % classes.length].id,
        trainer_id: trainer.id,
        room_id: rooms[i % rooms.length].id,
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

  // Test Case 2: Schedule hôm nay (IN_PROGRESS) - nếu là giờ hiện tại
  console.log('Creating today schedule (IN_PROGRESS)...');
  const todaySchedule = await prisma.schedule.create({
    data: {
      class_id: classes[0].id,
      trainer_id: trainer.id,
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

  // Test Case 3: Schedules tương lai gần (SCHEDULED) - 1-7 ngày tới
  console.log('Creating future schedules (SCHEDULED)...');
  for (let i = 1; i <= 7; i++) {
    const scheduleDate = new Date(today);
    scheduleDate.setDate(today.getDate() + i);

    const startTime = new Date(scheduleDate);
    startTime.setHours(9 + (i % 3), 0, 0, 0); // 9h, 10h, 11h

    const endTime = new Date(startTime);
    endTime.setMinutes(endTime.getMinutes() + classes[i % classes.length].duration);

    const currentBookings = Math.floor(Math.random() * 6) + 3; // 3-8 bookings
    const maxCapacity = classes[i % classes.length].max_capacity;
    const waitlistCount = currentBookings >= maxCapacity ? Math.floor(Math.random() * 5) + 1 : 0;

    const schedule = await prisma.schedule.create({
      data: {
        class_id: classes[i % classes.length].id,
        trainer_id: trainer.id,
        room_id: rooms[i % rooms.length].id,
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

  // Test Case 4: Schedule bị hủy (CANCELLED)
  console.log('Creating cancelled schedule...');
  const cancelledSchedule = await prisma.schedule.create({
    data: {
      class_id: classes[1].id,
      trainer_id: trainer.id,
      room_id: rooms[1].id,
      date: new Date(today.getFullYear(), today.getMonth(), today.getDate() + 2),
      start_time: new Date(today.getFullYear(), today.getMonth(), today.getDate() + 2, 16, 0, 0),
      end_time: new Date(today.getFullYear(), today.getMonth(), today.getDate() + 2, 17, 0, 0),
      status: ScheduleStatus.CANCELLED,
      current_bookings: 0,
      max_capacity: 12,
      waitlist_count: 0,
      price_override: null,
      special_notes: 'Lớp bị hủy do trainer bị ốm',
    },
  });
  schedules.push(cancelledSchedule);

  // Create a schedule with check-in enabled for testing
  const checkInEnabledSchedule = await prisma.schedule.create({
    data: {
      class_id: classes[2].id,
      trainer_id: trainer.id,
      room_id: rooms[2].id,
      date: new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1),
      start_time: new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1, 10, 0, 0), // 10AM tomorrow
      end_time: new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1, 11, 0, 0), // 11AM tomorrow
      status: ScheduleStatus.SCHEDULED,
      current_bookings: 5,
      max_capacity: 12,
      check_in_enabled: true,
      check_in_opened_at: new Date(),
      check_in_opened_by: trainer.id,
      special_notes: 'Test schedule with check-in enabled',
    },
  });
  schedules.push(checkInEnabledSchedule);
  console.log(`✅ Created check-in enabled schedule: ${checkInEnabledSchedule.id}`);

  logTestData(
    schedules.map(schedule => ({
      id: schedule.id,
      class_id: schedule.class_id,
      trainer_id: schedule.trainer_id,
      room_id: schedule.room_id,
      date: schedule.date.toISOString().split('T')[0],
      start_time: schedule.start_time.toISOString(),
      end_time: schedule.end_time.toISOString(),
      status: schedule.status,
      current_bookings: schedule.current_bookings,
      max_capacity: schedule.max_capacity,
      available_spots: schedule.max_capacity - schedule.current_bookings,
      waitlist_count: schedule.waitlist_count,
      special_notes: schedule.special_notes,
    })),
    'SCHEDULES DATA FOR TESTING'
  );

  // 7. Tạo bookings đa dạng cho test cases
  console.log('\n📝 Creating diverse bookings...');
  const bookings = [];

  // Bookings cho schedules đã hoàn thành (7 schedules đầu)
  const completedSchedules = schedules.filter(s => s.status === 'COMPLETED');
  console.log(`📋 Creating bookings for ${completedSchedules.length} completed schedules`);

  for (let i = 0; i < completedSchedules.length; i++) {
    const schedule = completedSchedules[i];
    const numBookings = Math.floor(Math.random() * 8) + 5; // 5-12 bookings per schedule

    for (let j = 0; j < numBookings; j++) {
      const memberId = memberIds[j % memberIds.length];

      // Kiểm tra xem booking đã tồn tại chưa
      const existingBooking = await prisma.booking.findFirst({
        where: {
          schedule_id: schedule.id,
          member_id: memberId,
        },
      });

      if (existingBooking) {
        console.log(
          `⚠️ Booking already exists for schedule ${schedule.id} and member ${memberId}, skipping...`
        );
        continue;
      }

      const booking = await prisma.booking.create({
        data: {
          schedule_id: schedule.id, // Sử dụng schedule.id thực tế
          member_id: memberId,
          status: BookingStatus.COMPLETED,
          booked_at: new Date(schedule.date.getTime() - 24 * 60 * 60 * 1000), // 1 ngày trước
          cancelled_at: null,
          cancellation_reason: null,
          payment_status: 'PAID',
          amount_paid: schedule.price_override || classes[i % classes.length].price,
          special_needs: j % 3 === 0 ? 'Cần hỗ trợ đặc biệt' : null,
          is_waitlist: false,
          waitlist_position: null,
          notes: `Booking ${j + 1} cho schedule ${schedule.id}`,
        },
      });
      bookings.push(booking);
    }
  }

  // Bookings cho schedule hôm nay (IN_PROGRESS)
  console.log(`📋 Creating bookings for today's schedule: ${todaySchedule.id}`);
  for (let j = 0; j < 8; j++) {
    const memberId = memberIds[j % memberIds.length];

    // Kiểm tra xem booking đã tồn tại chưa
    const existingBooking = await prisma.booking.findFirst({
      where: {
        schedule_id: todaySchedule.id,
        member_id: memberId,
      },
    });

    if (existingBooking) {
      console.log(
        `⚠️ Booking already exists for schedule ${todaySchedule.id} and member ${memberId}, skipping...`
      );
      continue;
    }

    const booking = await prisma.booking.create({
      data: {
        schedule_id: todaySchedule.id, // Sử dụng todaySchedule.id thực tế
        member_id: memberId,
        status: BookingStatus.CONFIRMED,
        booked_at: new Date(today.getTime() - 2 * 24 * 60 * 60 * 1000), // 2 ngày trước
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
  console.log(`📋 Creating bookings for ${futureSchedules.length} future schedules`);

  for (let i = 0; i < futureSchedules.length; i++) {
    const schedule = futureSchedules[i];
    const numBookings = Math.floor(Math.random() * 6) + 3; // 3-8 bookings per schedule

    for (let j = 0; j < numBookings; j++) {
      const memberId = memberIds[j % memberIds.length];

      // Kiểm tra xem booking đã tồn tại chưa
      const existingBooking = await prisma.booking.findFirst({
        where: {
          schedule_id: schedule.id,
          member_id: memberId,
        },
      });

      if (existingBooking) {
        console.log(
          `⚠️ Booking already exists for schedule ${schedule.id} and member ${memberId}, skipping...`
        );
        continue;
      }

      const booking = await prisma.booking.create({
        data: {
          schedule_id: schedule.id, // Sử dụng schedule.id thực tế
          member_id: memberId,
          status: BookingStatus.CONFIRMED,
          booked_at: new Date(
            today.getTime() - Math.floor(Math.random() * 7) * 24 * 60 * 60 * 1000
          ),
          cancelled_at: null,
          cancellation_reason: null,
          payment_status: j % 4 === 0 ? 'PENDING' : 'PAID',
          amount_paid: schedule.price_override || classes[i % classes.length].price,
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
  console.log(`📋 Creating waitlist bookings for ${fullSchedules.length} full schedules`);

  for (let i = 0; i < Math.min(5, fullSchedules.length); i++) {
    const schedule = fullSchedules[i];
    const memberId = memberIds[i % memberIds.length];

    // Kiểm tra xem booking đã tồn tại chưa
    const existingBooking = await prisma.booking.findFirst({
      where: {
        schedule_id: schedule.id,
        member_id: memberId,
      },
    });

    if (existingBooking) {
      console.log(
        `⚠️ Booking already exists for schedule ${schedule.id} and member ${memberId}, skipping...`
      );
      continue;
    }

    const booking = await prisma.booking.create({
      data: {
        schedule_id: schedule.id, // Sử dụng schedule.id thực tế
        member_id: memberId, // Sử dụng memberIds có sẵn
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

  logTestData(
    bookings.slice(0, 15).map(booking => ({
      id: booking.id,
      schedule_id: booking.schedule_id,
      member_id: booking.member_id,
      status: booking.status,
      payment_status: booking.payment_status,
      amount_paid: booking.amount_paid,
      is_waitlist: booking.is_waitlist,
      waitlist_position: booking.waitlist_position,
      special_needs: booking.special_needs,
    })),
    'BOOKINGS DATA FOR TESTING (First 15)'
  );

  // 8. Tạo attendance records với ratings đa dạng
  console.log('\n✅ Creating attendance records with diverse ratings...');
  const attendanceRecords = [];

  // Attendance cho TẤT CẢ schedules (bao gồm cả ngày hiện tại)
  console.log(`📊 Total schedules to process: ${schedules.length}`);
  console.log(
    `📊 Schedules data:`,
    schedules.map(s => ({ id: s.id, status: s.status, date: s.date }))
  );

  for (let i = 0; i < schedules.length; i++) {
    const schedule = schedules[i];
    console.log(
      `📋 Processing schedule ${i + 1}: ID=${schedule.id}, Status=${schedule.status}, Date=${schedule.date}`
    );
    const scheduleDate = new Date(schedule.start_time);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Xác định số lượng attendance dựa trên trạng thái schedule
    let numAttendance;
    if (schedule.status === 'COMPLETED') {
      numAttendance = Math.floor(Math.random() * 6) + 4; // 4-9 attendance per completed schedule
    } else if (schedule.status === 'IN_PROGRESS') {
      numAttendance = Math.floor(Math.random() * 4) + 2; // 2-5 attendance for in-progress schedule
    } else if (schedule.status === 'SCHEDULED' && scheduleDate <= today) {
      numAttendance = Math.floor(Math.random() * 3) + 1; // 1-3 attendance for today's scheduled classes
    } else {
      continue; // Skip future schedules
    }

    console.log(
      `📋 Creating ${numAttendance} attendance records for schedule ${i + 1} (${schedule.status})`
    );

    for (let j = 0; j < numAttendance; j++) {
      const checkedInAt = new Date(schedule.start_time);

      // Tạo thời gian check-in đa dạng
      if (schedule.status === 'COMPLETED') {
        // Cho completed schedules: có thể trễ 0-15 phút
        checkedInAt.setMinutes(checkedInAt.getMinutes() + Math.floor(Math.random() * 15));
      } else if (schedule.status === 'IN_PROGRESS') {
        // Cho in-progress schedules: có thể trễ 0-10 phút
        checkedInAt.setMinutes(checkedInAt.getMinutes() + Math.floor(Math.random() * 10));
      } else {
        // Cho scheduled classes hôm nay: có thể trễ 0-5 phút
        checkedInAt.setMinutes(checkedInAt.getMinutes() + Math.floor(Math.random() * 5));
      }

      const checkedOutAt = new Date(schedule.end_time);
      checkedOutAt.setMinutes(checkedOutAt.getMinutes() - Math.floor(Math.random() * 10)); // Sớm 0-10 phút

      // Tạo ratings đa dạng: 2-5 stars
      const classRating = Math.floor(Math.random() * 4) + 2; // 2, 3, 4, 5
      const trainerRating = Math.floor(Math.random() * 4) + 2; // 2, 3, 4, 5

      const attendance = await prisma.attendance.create({
        data: {
          schedule_id: schedule.id,
          member_id: memberIds[j % memberIds.length],
          checked_in_at: checkedInAt,
          checked_out_at: checkedOutAt,
          attendance_method: AttendanceMethod.MANUAL,
          class_rating: classRating,
          trainer_rating: trainerRating,
          feedback_notes: `Feedback từ member ${j + 1} cho lớp ${i + 1} (${schedule.status}): ${classRating >= 4 ? 'Rất hài lòng' : 'Cần cải thiện'}`,
        },
      });
      attendanceRecords.push(attendance);
    }
  }

  logTestData(
    attendanceRecords.slice(0, 10).map(attendance => ({
      id: attendance.id,
      schedule_id: attendance.schedule_id,
      member_id: attendance.member_id,
      checked_in_at: attendance.checked_in_at,
      checked_out_at: attendance.checked_out_at,
      class_rating: attendance.class_rating,
      trainer_rating: attendance.trainer_rating,
      feedback_notes: attendance.feedback_notes,
    })),
    'ATTENDANCE DATA FOR TESTING (First 10)'
  );

  // 9. Log comprehensive test data
  console.log('\n🎉 Comprehensive seed completed successfully!');
  console.log(`✅ Created trainer: ${trainer.full_name} (ID: ${trainer.id})`);
  console.log(`✅ Created ${certifications.length} certifications`);
  console.log(`✅ Created ${classes.length} gym classes`);
  console.log(`✅ Created ${rooms.length} rooms`);
  console.log(`✅ Created ${schedules.length} schedules`);
  console.log(`✅ Created ${bookings.length} bookings`);
  console.log(`✅ Created ${attendanceRecords.length} attendance records`);

  // Log attendance records by schedule status
  const attendanceByStatus = {
    completed: attendanceRecords.filter(a => {
      const schedule = schedules.find(s => s.id === a.schedule_id);
      return schedule?.status === 'COMPLETED';
    }).length,
    in_progress: attendanceRecords.filter(a => {
      const schedule = schedules.find(s => s.id === a.schedule_id);
      return schedule?.status === 'IN_PROGRESS';
    }).length,
    scheduled: attendanceRecords.filter(a => {
      const schedule = schedules.find(s => s.id === a.schedule_id);
      return schedule?.status === 'SCHEDULED';
    }).length,
  };

  console.log(`📊 Attendance records by status:`);
  console.log(`   - COMPLETED schedules: ${attendanceByStatus.completed} records`);
  console.log(`   - IN_PROGRESS schedules: ${attendanceByStatus.in_progress} records`);
  console.log(`   - SCHEDULED schedules: ${attendanceByStatus.scheduled} records`);

  // 10. Log test scenarios và endpoints
  console.log('\n🔗 COMPREHENSIVE TEST SCENARIOS:');
  console.log('='.repeat(60));

  logTestData(
    {
      test_dates: {
        today: todayStr,
        past_7_days: Array.from({ length: 7 }, (_, i) => {
          const date = new Date(today);
          date.setDate(today.getDate() - i - 1);
          return date.toISOString().split('T')[0];
        }),
        future_7_days: Array.from({ length: 7 }, (_, i) => {
          const date = new Date(today);
          date.setDate(today.getDate() + i + 1);
          return date.toISOString().split('T')[0];
        }),
      },
      certification_test_cases: {
        valid_combinations: [
          { category: 'YOGA', difficulty: 'BEGINNER', can_teach: true },
          { category: 'YOGA', difficulty: 'INTERMEDIATE', can_teach: true },
          { category: 'YOGA', difficulty: 'ADVANCED', can_teach: true },
          { category: 'PILATES', difficulty: 'INTERMEDIATE', can_teach: true },
          { category: 'RECOVERY', difficulty: 'ALL_LEVELS', can_teach: true },
          { category: 'STRENGTH', difficulty: 'INTERMEDIATE', can_teach: true },
        ],
        invalid_combinations: [
          {
            category: 'CARDIO',
            difficulty: 'BEGINNER',
            can_teach: false,
            reason: 'No certification',
          },
          {
            category: 'DANCE',
            difficulty: 'INTERMEDIATE',
            can_teach: false,
            reason: 'No certification',
          },
        ],
      },
      schedule_test_cases: {
        completed_schedules: schedules
          .slice(0, 7)
          .map(s => ({ id: s.id, date: s.date.toISOString().split('T')[0], status: s.status })),
        in_progress_schedule: {
          id: todaySchedule.id,
          date: todayStr,
          status: todaySchedule.status,
        },
        future_schedules: schedules
          .slice(8, 15)
          .map(s => ({ id: s.id, date: s.date.toISOString().split('T')[0], status: s.status })),
        cancelled_schedule: {
          id: cancelledSchedule.id,
          date: cancelledSchedule.date.toISOString().split('T')[0],
          status: cancelledSchedule.status,
        },
      },
      booking_test_cases: {
        completed_bookings: bookings.filter(b => b.status === 'COMPLETED').length,
        confirmed_bookings: bookings.filter(b => b.status === 'CONFIRMED').length,
        waitlist_bookings: bookings.filter(b => b.status === 'WAITLIST').length,
        paid_bookings: bookings.filter(b => b.payment_status === 'PAID').length,
        pending_bookings: bookings.filter(b => b.payment_status === 'PENDING').length,
      },
    },
    'TEST SCENARIOS & DATA'
  );

  logTestData(
    {
      api_endpoints: {
        trainer_endpoints: {
          get_trainer: `GET /trainers/user/${trainer.user_id}`,
          get_certifications: `GET /trainers/user/${trainer.user_id}/certifications`,
          get_available_categories: `GET /trainers/user/${trainer.user_id}/available-categories`,
          create_schedule: `POST /trainers/user/${trainer.user_id}/schedules`,
          get_schedules: `GET /trainers/user/${trainer.user_id}/schedules`,
          get_revenue: `GET /trainers/user/${trainer.user_id}/revenue`,
        },
        schedule_endpoints: {
          get_all_schedules: `GET /schedules`,
          get_schedule_by_id: `GET /schedules/${schedules[0].id}`,
          get_schedules_by_date: `GET /schedules/date/${todayStr}`,
          get_filter_options: `GET /schedules/filter-options`,
          get_upcoming: `GET /schedules/upcoming`,
        },
        booking_endpoints: {
          create_booking: `POST /bookings`,
          get_bookings: `GET /bookings`,
          cancel_booking: `DELETE /bookings/{booking_id}`,
          get_member_bookings: `GET /bookings/members/{member_id}`,
          get_waitlist: `GET /bookings/schedule/{schedule_id}/waitlist`,
        },
        room_endpoints: {
          get_rooms: `GET /rooms`,
          get_available_rooms: `GET /rooms/available`,
        },
      },
    },
    'API ENDPOINTS FOR TESTING'
  );

  console.log('\n📊 Expected results after triggers:');
  console.log(`   - total_classes: 7 (schedules with status COMPLETED)`);
  console.log(`   - rating_average: ~3.5 (average of trainer_rating from attendance)`);
  console.log('\n🚀 Ready for comprehensive testing!');
  console.log('\n💡 Test Tips:');
  console.log('   - Use the trainer user_id for authentication tests');
  console.log('   - Test certification validation with different category/difficulty combinations');
  console.log('   - Test schedule creation with various date ranges');
  console.log('   - Test booking flow with different capacity scenarios');
  console.log('   - Test attendance and rating system with completed schedules');
}

main()
  .catch(e => {
    console.error('❌ Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
