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
  console.log('[DELETE]  Xóa dữ liệu cũ...');
  await prisma.accessLog.deleteMany();
  await prisma.session.deleteMany();
  await prisma.passwordReset.deleteMany();
  await prisma.oTPVerification.deleteMany();
  await prisma.member.deleteMany();
  await prisma.staff.deleteMany();
  await prisma.user.deleteMany();

  const hashedPassword = await bcrypt.hash('123abcC@', 12);

  // 1. Tạo Super Admin
  console.log('[AUTH] Tạo Super Admin...');
  const superAdmin = await prisma.user.upsert({
    where: { email: 'superadmin@gym147.dev' },
    update: {
      password_hash: hashedPassword,
      first_name: 'Super',
      last_name: 'Admin',
      phone: '+84901000001',
      role: Role.SUPER_ADMIN,
      is_active: true,
      email_verified: true,
      email_verified_at: new Date(),
      phone_verified: true,
      phone_verified_at: new Date(),
      last_login_at: new Date(),
    },
    create: {
      email: 'superadmin@gym147.dev',
      password_hash: hashedPassword,
      first_name: 'Super',
      last_name: 'Admin',
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
  console.log('[SUCCESS] Super Admin:', superAdmin.email);

  // 2. Tạo Users cho Members (12 members)
  console.log('[MEMBERS] Tạo users cho members...');
  const memberUsers = [];
  const memberData = [
    { user_id: 'member_001_nguyen_van_a', name: 'Nguyễn Văn A', email: 'nguyenvana@example.com', phone: '0123456789' },
    { user_id: 'member_002_tran_thi_b', name: 'Trần Thị B', email: 'tranthib@example.com', phone: '0123456790' },
    { user_id: 'member_003_le_van_c', name: 'Lê Văn C', email: 'levanc@example.com', phone: '0123456791' },
    { user_id: 'member_004_pham_thi_d', name: 'Phạm Thị D', email: 'phamthid@example.com', phone: '0123456792' },
    { user_id: 'member_005_hoang_van_e', name: 'Hoàng Văn E', email: 'hoangvane@example.com', phone: '0123456793' },
    { user_id: 'member_006_vo_thi_f', name: 'Võ Thị F', email: 'vothif@example.com', phone: '0123456794' },
    { user_id: 'member_007_dang_van_g', name: 'Đặng Văn G', email: 'dangvang@example.com', phone: '0123456795' },
    { user_id: 'member_008_bui_thi_h', name: 'Bùi Thị H', email: 'buithih@example.com', phone: '0123456796' },
    { user_id: 'member_009_ly_van_i', name: 'Lý Văn I', email: 'lyvani@example.com', phone: '0123456797' },
    { user_id: 'member_010_do_thi_j', name: 'Đỗ Thị J', email: 'dothij@example.com', phone: '0123456798' },
    { user_id: 'member_011_nguyen_thi_k', name: 'Nguyễn Thị K', email: 'nguyenthik@example.com', phone: '0123456799' },
    { user_id: 'member_012_tran_van_l', name: 'Trần Văn L', email: 'tranvanl@example.com', phone: '0123456800' },
  ];

  for (const member of memberData) {
    const nameParts = member.name.split(' ');
    const firstName = nameParts[0];
    const lastName = nameParts.slice(1).join(' ');

    const user = await prisma.user.create({
      data: {
        id: member.user_id,
        email: member.email,
        password_hash: hashedPassword,
        first_name: firstName,
        last_name: lastName,
        phone: member.phone,
        role: Role.MEMBER,
        is_active: true,
        email_verified: true,
        email_verified_at: new Date(),
        phone_verified: true,
        phone_verified_at: new Date(),
        last_login_at: new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000), // 0-7 ngày trước
      },
    });
    memberUsers.push(user);
    console.log(`[SUCCESS] Created member user: ${user.email} (${user.id})`);
  }

  // 3. Tạo Users cho Trainers (4 trainers)
  console.log('[TRAINERS] Tạo users cho trainers...');
  const trainerUsers = [];
  const trainerData = [
    { user_id: 'trainer_001_nguyen_van_minh', name: 'Nguyễn Văn Minh', email: 'minh.nguyen@gym147.dev', phone: '+84901000003' },
    { user_id: 'trainer_002_tran_thi_lan', name: 'Trần Thị Lan', email: 'lan.tran@gym147.dev', phone: '+84901000004' },
    { user_id: 'trainer_003_le_van_hung', name: 'Lê Văn Hùng', email: 'hung.le@gym147.dev', phone: '+84901000005' },
    { user_id: 'trainer_004_pham_thi_hoa', name: 'Phạm Thị Hoa', email: 'hoa.pham@gym147.dev', phone: '+84901000006' },
  ];

  for (const trainer of trainerData) {
    const nameParts = trainer.name.split(' ');
    const firstName = nameParts[0];
    const lastName = nameParts.slice(1).join(' ');

    const user = await prisma.user.create({
      data: {
        id: trainer.user_id,
        email: trainer.email,
        password_hash: hashedPassword,
        first_name: firstName,
        last_name: lastName,
        phone: trainer.phone,
        role: Role.TRAINER,
        is_active: true,
        email_verified: true,
        email_verified_at: new Date(),
        phone_verified: true,
        phone_verified_at: new Date(),
        last_login_at: new Date(Date.now() - Math.random() * 3 * 24 * 60 * 60 * 1000), // 0-3 ngày trước
      },
    });
    trainerUsers.push(user);
    console.log(`[SUCCESS] Created trainer user: ${user.email} (${user.id})`);
  }

  // 4. Tạo Gym Memberships cho tất cả users
  console.log('[MEMBERSHIPS] Tạo gym memberships...');
  for (const user of [...memberUsers, ...trainerUsers, superAdmin]) {
    await prisma.gymMembership.create({
      data: {
        user_id: user.id,
        gym_id: 'gym-147',
        gym_name: 'Gym 147',
        status: 'ACTIVE',
        role: user.role,
        joined_at: new Date(Date.now() - Math.random() * 90 * 24 * 60 * 60 * 1000), // 0-90 ngày trước
        is_primary: true,
      },
    });
  }
  console.log('[SUCCESS] Created gym memberships');

  console.log('\n[CELEBRATE] Hoàn thành seed data cho Identity Service!');
  console.log('[LIST] Thông tin đăng nhập:');
  console.log('   Super Admin:');
  console.log('     Email: superadmin@gym147.dev');
  console.log('     Password: 123abcC@');
  console.log('\n   Members (12):');
  memberData.forEach(m => console.log(`     ${m.email} / 123abcC@`));
  console.log('\n   Trainers (4):');
  trainerData.forEach(t => console.log(`     ${t.email} / 123abcC@`));
  console.log('\n[LINK] Member IDs cho các services khác:');
  memberData.forEach(m => console.log(`   - ${m.user_id}`));
  console.log('\n[LINK] Trainer IDs cho schedule service:');
  trainerData.forEach(t => console.log(`   - ${t.user_id}`));
}

main()
  .catch(e => {
    console.error('[ERROR] Lỗi seed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
