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

  // Tạo Super Admin duy nhất
  console.log('Tạo Super Admin...');
  const hashedPassword = await bcrypt.hash('123abcC@', 10);

  await prisma.user.create({
    data: {
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

  console.log('Hoàn thành seed data cho Identity Service!');
  console.log('   - 1 Super Admin (superadmin@gym147.dev / 123abcC@)');
}

main()
  .catch(e => {
    console.error('❌ Lỗi seed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
