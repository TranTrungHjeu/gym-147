const { PrismaClient } = require('../../../node_modules/@prisma/client');
const prisma = new PrismaClient();

async function seedDatabase() {
  console.log('🌱 Starting database seed...');

  try {
    // Clear existing data
    console.log('🧹 Cleaning existing data...');
    await prisma.schedule.deleteMany();
    await prisma.gymClass.deleteMany();
    await prisma.room.deleteMany();
    await prisma.instructor.deleteMany();

    // Create Instructors
    console.log('👨‍🏫 Creating instructors...');
    const instructors = await Promise.all([
      prisma.instructor.create({
        data: {
          id: 'instructor_1',
          user_id: 'user_instructor_1',
          full_name: 'Sarah Johnson',
          email: 'sarah.johnson@gym.com',
          phone: '+1-555-0123',
          specializations: ['YOGA', 'PILATES'],
          experience_years: 8,
          hourly_rate: 75.0,
          bio: 'Certified yoga instructor with 8 years of experience in Hatha and Vinyasa yoga',
          profile_photo: 'https://images.unsplash.com/photo-1494790108755-2616b612b47c?w=150',
        },
      }),
      prisma.instructor.create({
        data: {
          id: 'instructor_2',
          user_id: 'user_instructor_2',
          full_name: 'Mike Thompson',
          email: 'mike.thompson@gym.com',
          phone: '+1-555-0124',
          specializations: ['STRENGTH', 'CARDIO'],
          experience_years: 12,
          hourly_rate: 85.0,
          bio: 'Former professional athlete turned fitness trainer, specializing in strength and conditioning',
          profile_photo: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150',
        },
      }),
      prisma.instructor.create({
        data: {
          id: 'instructor_3',
          user_id: 'user_instructor_3',
          full_name: 'Emily Chen',
          email: 'emily.chen@gym.com',
          phone: '+1-555-0125',
          specializations: ['DANCE', 'CARDIO'],
          experience_years: 6,
          hourly_rate: 70.0,
          bio: 'Dance instructor with expertise in Zumba, contemporary dance, and high-energy cardio workouts',
          profile_photo: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=150',
        },
      }),
    ]);
    console.log(`✅ Created ${instructors.length} instructors`);

    // Create Rooms
    console.log('🏠 Creating rooms...');
    const rooms = await Promise.all([
      prisma.room.create({
        data: {
          id: 'room_1',
          name: 'Studio A - Main Hall',
          capacity: 30,
          equipment: ['Yoga mats', 'Blocks', 'Straps', 'Sound system'],
          amenities: ['MIRRORS', 'SOUND_SYSTEM'],
          floor_type: 'HARDWOOD',
        },
      }),
      prisma.room.create({
        data: {
          id: 'room_2',
          name: 'Strength Training Zone',
          capacity: 15,
          equipment: ['Free weights', 'Resistance bands', 'Kettlebells', 'Bench press'],
          amenities: ['MIRRORS'],
          floor_type: 'RUBBER',
        },
      }),
      prisma.room.create({
        data: {
          id: 'room_3',
          name: 'Cardio Studio',
          capacity: 20,
          equipment: ['Treadmills', 'Stationary bikes', 'Sound system', 'Mirrors'],
          amenities: ['MIRRORS', 'SOUND_SYSTEM'],
          floor_type: 'RUBBER',
        },
      }),
    ]);
    console.log(`✅ Created ${rooms.length} rooms`);

    // Create Gym Classes
    console.log('💪 Creating gym classes...');
    const classes = await Promise.all([
      prisma.gymClass.create({
        data: {
          id: 'class_1',
          name: 'Morning Yoga Flow',
          description: 'Start your day with energizing yoga poses and breathing exercises',
          category: 'YOGA',
          difficulty: 'BEGINNER',
          duration: 60,
          max_capacity: 15,
          price: 25.0,
          equipment_needed: ['Yoga mats', 'Blocks', 'Straps'],
        },
      }),
      prisma.gymClass.create({
        data: {
          id: 'class_2',
          name: 'HIIT Power Training',
          description: 'High-intensity interval training for maximum calorie burn',
          category: 'CARDIO',
          difficulty: 'ADVANCED',
          duration: 45,
          max_capacity: 12,
          price: 35.0,
          equipment_needed: ['Treadmill', 'Heart monitor'],
        },
      }),
      prisma.gymClass.create({
        data: {
          id: 'class_3',
          name: 'Strength & Conditioning',
          description: 'Build muscle and improve overall strength with weight training',
          category: 'STRENGTH',
          difficulty: 'INTERMEDIATE',
          duration: 50,
          max_capacity: 10,
          price: 30.0,
          equipment_needed: ['Weights', 'Bench', 'Barbells'],
        },
      }),
      prisma.gymClass.create({
        data: {
          id: 'class_4',
          name: 'Zumba Dance Fitness',
          description: 'Fun dance workout combining Latin and international music',
          category: 'DANCE',
          difficulty: 'BEGINNER',
          duration: 55,
          max_capacity: 25,
          price: 28.0,
          equipment_needed: ['Sound system', 'Mirrors'],
        },
      }),
    ]);
    console.log(`✅ Created ${classes.length} gym classes`);

    // Create Schedules
    console.log('📅 Creating schedules...');
    const schedules = await Promise.all([
      prisma.schedule.create({
        data: {
          id: 'schedule_1',
          class_id: 'class_1',
          instructor_id: 'instructor_1',
          room_id: 'room_1',
          date: new Date('2024-12-01T00:00:00Z'),
          start_time: new Date('2024-12-01T08:00:00Z'),
          end_time: new Date('2024-12-01T09:00:00Z'),
          max_capacity: 15,
          current_bookings: 8,
          status: 'SCHEDULED',
        },
      }),
      prisma.schedule.create({
        data: {
          id: 'schedule_2',
          class_id: 'class_2',
          instructor_id: 'instructor_2',
          room_id: 'room_3',
          date: new Date('2024-12-01T00:00:00Z'),
          start_time: new Date('2024-12-01T18:00:00Z'),
          end_time: new Date('2024-12-01T18:45:00Z'),
          max_capacity: 12,
          current_bookings: 10,
          status: 'SCHEDULED',
        },
      }),
      prisma.schedule.create({
        data: {
          id: 'schedule_3',
          class_id: 'class_4',
          instructor_id: 'instructor_3',
          room_id: 'room_1',
          date: new Date('2024-12-01T00:00:00Z'),
          start_time: new Date('2024-12-01T19:30:00Z'),
          end_time: new Date('2024-12-01T20:25:00Z'),
          max_capacity: 25,
          current_bookings: 15,
          status: 'SCHEDULED',
        },
      }),
    ]);
    console.log(`✅ Created ${schedules.length} schedules`);

    console.log('🎉 Database seeded successfully!');
    console.log(
      `📊 Summary: ${instructors.length} instructors, ${rooms.length} rooms, ${classes.length} classes, ${schedules.length} schedules`
    );
  } catch (error) {
    console.error('❌ Error seeding database:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run the seed function
if (require.main === module) {
  seedDatabase()
    .then(() => {
      console.log('✅ Seed completed successfully');
      process.exit(0);
    })
    .catch(error => {
      console.error('❌ Seed failed:', error);
      process.exit(1);
    });
}

module.exports = { seedDatabase };
