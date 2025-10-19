const {
  PrismaClient,
  Role,
  Platform,
  AccessType,
  AccessMethod,
  OTPType,
} = require('@prisma/client');
const bcrypt = require('bcrypt');

const prisma = new PrismaClient();

async function main() {
  console.log('Bắt đầu tạo seed data cho Identity Service...');

  // Xóa dữ liệu cũ
  console.log('🗑️  Xóa dữ liệu cũ...');
  await prisma.accessLog.deleteMany();
  await prisma.session.deleteMany();
  await prisma.passwordReset.deleteMany();
  await prisma.oTPVerification.deleteMany();
  await prisma.member.deleteMany();
  await prisma.staff.deleteMany();
  await prisma.user.deleteMany();

  // Mật khẩu mặc định cho tất cả tài khoản: "admin"
  const hashedPassword = await bcrypt.hash('admin', 10);

  // 1. Tạo Super Admin
  console.log('Tạo Super Admin...');
  const superAdmin = await prisma.user.create({
    data: {
      email: 'superadmin@gym147.dev',
      password_hash: hashedPassword,
      first_name: 'Quản trị',
      last_name: 'Cao cấp',
      phone: '+84901000001',
      role: Role.SUPER_ADMIN,
      is_active: true,
      email_verified: true,
      email_verified_at: new Date(),
      phone_verified: true,
      phone_verified_at: new Date(),
      last_login_at: new Date(),
    },
  });

  // 2. Tạo Admin
  console.log('Tạo Admin...');
  const admin = await prisma.user.create({
    data: {
      email: 'admin@gym147.dev',
      password_hash: hashedPassword,
      first_name: 'Quản lý',
      last_name: 'Hệ thống',
      phone: '+84901000002',
      role: Role.ADMIN,
      is_active: true,
      email_verified: true,
      email_verified_at: new Date(),
      phone_verified: true,
      phone_verified_at: new Date(),
      last_login_at: new Date(),
    },
  });

  // 3. Tạo 5 Trainers
  console.log('Tạo 5 Huấn luyện viên...');
  const trainerData = [
    {
      first_name: 'Minh',
      last_name: 'Nguyễn Văn',
      email: 'minh.nguyen@gym147.dev',
      phone: '+84901000003',
    },
    {
      first_name: 'Hùng',
      last_name: 'Trần Đức',
      email: 'hung.tran@gym147.dev',
      phone: '+84901000004',
    },
    {
      first_name: 'Tuấn',
      last_name: 'Lê Hoàng',
      email: 'tuan.le@gym147.dev',
      phone: '+84901000005',
    },
    {
      first_name: 'Đức',
      last_name: 'Phạm Minh',
      email: 'duc.pham@gym147.dev',
      phone: '+84901000006',
    },
    {
      first_name: 'Khoa',
      last_name: 'Hoàng Văn',
      email: 'khoa.hoang@gym147.dev',
      phone: '+84901000007',
    },
  ];

  const trainers = [];
  for (const trainer of trainerData) {
    const trainerUser = await prisma.user.create({
      data: {
        email: trainer.email,
        password_hash: hashedPassword,
        first_name: trainer.first_name,
        last_name: trainer.last_name,
        phone: trainer.phone,
        role: Role.TRAINER,
        is_active: true,
        email_verified: true,
        email_verified_at: new Date(),
        phone_verified: true,
        phone_verified_at: new Date(),
        last_login_at: new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000),
      },
    });
    trainers.push(trainerUser);
  }

  // 4. Tạo 50 Members
  console.log('Tạo 50 Thành viên...');
  const memberFirstNames = [
    'An',
    'Bình',
    'Cường',
    'Dũng',
    'Đạt',
    'Giang',
    'Huy',
    'Kiên',
    'Lộc',
    'Minh',
    'Phát',
    'Quân',
    'Tâm',
    'Thắng',
    'Việt',
    'Xuân',
    'Ân',
    'Bách',
    'Công',
    'Danh',
    'Hào',
    'Hiếu',
    'Khang',
    'Lợi',
    'Nam',
    'Phú',
    'Quyền',
    'Sang',
    'Thiện',
    'Trung',
    'Uyên',
    'Vân',
    'Yên',
    'Châu',
    'Diễm',
    'Huyền',
    'Khanh',
    'Linh',
    'My',
    'Như',
    'Phương',
    'Quỳnh',
    'Thư',
    'Trinh',
    'Vân',
    'Xuân',
    'Yến',
    'Ánh',
    'Bích',
    'Cẩm',
  ];

  const memberLastNames = [
    'Nguyễn',
    'Trần',
    'Lê',
    'Phạm',
    'Hoàng',
    'Phan',
    'Vũ',
    'Đặng',
    'Bùi',
    'Đỗ',
    'Hồ',
    'Ngô',
    'Dương',
    'Lý',
    'Đinh',
    'Đoàn',
    'Trịnh',
    'Lương',
    'Võ',
    'Huỳnh',
  ];

  const members = [];
  for (let i = 0; i < 50; i++) {
    const firstName = memberFirstNames[i];
    const lastName = memberLastNames[i % memberLastNames.length];
    const member = await prisma.user.create({
      data: {
        email: `member${i + 1}@gym147.dev`,
        password_hash: hashedPassword,
        first_name: firstName,
        last_name: lastName,
        phone: `+8491${(1000003 + i).toString().padStart(7, '0')}`,
        role: Role.MEMBER,
        is_active: i < 47, // 47 hoạt động, 3 không hoạt động
        email_verified: i % 2 === 0,
        email_verified_at: i % 2 === 0 ? new Date() : null,
        phone_verified: i % 3 !== 0,
        phone_verified_at: i % 3 !== 0 ? new Date() : null,
        last_login_at: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000),
      },
    });
    members.push(member);
  }

  // 5. Tạo Sessions cho người dùng hoạt động
  console.log('Tạo Sessions...');
  const allUsers = [superAdmin, admin, ...trainers, ...members];
  for (const user of allUsers.filter(u => u.is_active)) {
    if (Math.random() > 0.3) {
      // 70% có session hoạt động
      await prisma.session.create({
        data: {
          user_id: user.id,
          token: `token_${user.id}_${Date.now()}`,
          refresh_token: `refresh_${user.id}_${Date.now()}`,
          device_info: ['iPhone 13', 'Samsung Galaxy S21', 'MacBook Pro', 'Máy tính Windows'][
            Math.floor(Math.random() * 4)
          ],
          platform: [Platform.MOBILE_IOS, Platform.MOBILE_ANDROID, Platform.WEB][
            Math.floor(Math.random() * 3)
          ],
          expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
          ip_address: `192.168.1.${Math.floor(Math.random() * 255)}`,
          user_agent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        },
      });
    }
  }

  // 6. Tạo Access Logs cho thành viên (ra vào phòng gym)
  console.log('Tạo Access Logs...');
  for (const member of members.slice(0, 40)) {
    // 40 thành viên có access logs
    const numLogs = Math.floor(Math.random() * 30) + 20; // 20-50 logs mỗi thành viên
    for (let i = 0; i < numLogs; i++) {
      const entryTime = new Date(Date.now() - Math.random() * 90 * 24 * 60 * 60 * 1000);
      const accessMethods = [
        AccessMethod.RFID,
        AccessMethod.QR_CODE,
        AccessMethod.FACE_RECOGNITION,
        AccessMethod.MANUAL,
      ];
      const method = accessMethods[Math.floor(Math.random() * accessMethods.length)];

      // Log vào
      await prisma.accessLog.create({
        data: {
          user_id: member.id,
          access_type: AccessType.ENTRY,
          access_method: method,
          device_id: `CỔNG_${Math.floor(Math.random() * 5) + 1}`,
          location: ['Cổng chính', 'Cổng VIP', 'Cổng phụ'][Math.floor(Math.random() * 3)],
          success: Math.random() > 0.05, // 95% thành công
          failure_reason: Math.random() > 0.95 ? 'Lỗi đọc thẻ' : null,
          timestamp: entryTime,
          sensor_data: {
            temperature: (36 + Math.random()).toFixed(1),
            maskDetected: Math.random() > 0.2,
          },
        },
      });

      // Log ra (80% các lần vào có log ra)
      if (Math.random() > 0.2) {
        const exitTime = new Date(entryTime.getTime() + (60 + Math.random() * 120) * 60 * 1000);
        await prisma.accessLog.create({
          data: {
            user_id: member.id,
            access_type: AccessType.EXIT,
            access_method: method,
            device_id: `CỔNG_${Math.floor(Math.random() * 5) + 1}`,
            location: ['Cổng ra chính', 'Cổng ra VIP', 'Cổng ra phụ'][
              Math.floor(Math.random() * 3)
            ],
            success: true,
            timestamp: exitTime,
          },
        });
      }
    }
  }

  // 7. Tạo OTP Verifications
  console.log('Tạo OTP Verifications...');
  for (let i = 0; i < 100; i++) {
    const user = allUsers[Math.floor(Math.random() * allUsers.length)];
    await prisma.oTPVerification.create({
      data: {
        identifier: Math.random() > 0.5 ? user.email : user.phone,
        otp: await bcrypt.hash(Math.floor(100000 + Math.random() * 900000).toString(), 5),
        type: Math.random() > 0.5 ? OTPType.EMAIL : OTPType.PHONE,
        attempts: Math.floor(Math.random() * 3),
        expires_at: new Date(Date.now() + 15 * 60 * 1000),
        verified_at: Math.random() > 0.3 ? new Date() : null,
        created_at: new Date(Date.now() - Math.random() * 24 * 60 * 60 * 1000),
      },
    });
  }

  // 8. Tạo Password Resets
  console.log('Tạo Password Resets...');
  for (let i = 0; i < 30; i++) {
    const user = [...members, ...trainers][Math.floor(Math.random() * 55)];
    await prisma.passwordReset.create({
      data: {
        user_id: user.id,
        token: `reset_${user.id}_${Date.now()}_${Math.random()}`,
        expires_at: new Date(Date.now() + 60 * 60 * 1000),
        used_at: Math.random() > 0.5 ? new Date() : null,
        created_at: new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000),
      },
    });
  }

  console.log('Hoàn thành seed data cho Identity Service!');
  console.log(`   - 1 Super Admin (superadmin@gym147.dev)`);
  console.log(`   - 1 Admin (admin@gym147.dev)`);
  console.log(`   - 5 Huấn luyện viên (trainer@gym147.dev)`);
  console.log(`   - 50 Thành viên (member@gym147.dev)`);
  console.log(`   - ${allUsers.filter(u => u.is_active).length} Sessions hoạt động`);
  console.log(`   - Access Logs cho 40 thành viên`);
  console.log(`   - 100 OTP Verifications`);
  console.log(`   - 30 Password Resets`);
  console.log(`   - Mật khẩu mặc định cho tất cả: "admin"`);
}

main()
  .catch(e => {
    console.error('❌ Lỗi seed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
