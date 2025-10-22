const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function seedEquipmentUsage() {
  try {
    console.log('🌱 Seeding equipment usage data...');

    // Get all gym sessions
    const sessions = await prisma.gymSession.findMany({
      take: 10, // Take first 10 sessions
      orderBy: { entry_time: 'desc' },
    });

    console.log(`Found ${sessions.length} sessions`);

    // Get all equipment
    const equipment = await prisma.equipment.findMany({
      take: 10,
    });

    console.log(`Found ${equipment.length} equipment items`);

    // Create equipment usage for each session
    for (const session of sessions) {
      // Randomly assign 1-3 equipment per session
      const numEquipment = Math.floor(Math.random() * 3) + 1;
      const selectedEquipment = equipment.sort(() => 0.5 - Math.random()).slice(0, numEquipment);

      for (const eq of selectedEquipment) {
        const startTime = new Date(session.entry_time);
        const endTime = new Date(startTime.getTime() + (Math.random() * 60 + 10) * 60000); // 10-70 minutes later

        await prisma.equipmentUsage.create({
          data: {
            member_id: session.member_id,
            equipment_id: eq.id,
            session_id: session.id, // Link to session
            start_time: startTime,
            end_time: endTime,
            duration: Math.floor((endTime - startTime) / 60000), // in minutes
            calories_burned: Math.floor(Math.random() * 200) + 50, // 50-250 calories
            sets_completed: Math.floor(Math.random() * 5) + 1, // 1-5 sets
            weight_used: eq.max_weight
              ? Math.floor(Math.random() * eq.max_weight * 0.8) + 10
              : null,
            reps_completed: Math.floor(Math.random() * 20) + 5, // 5-25 reps
            heart_rate_avg: Math.floor(Math.random() * 40) + 120, // 120-160 bpm
            heart_rate_max: Math.floor(Math.random() * 20) + 160, // 160-180 bpm
            sensor_data: {
              temperature: Math.floor(Math.random() * 10) + 20, // 20-30°C
              humidity: Math.floor(Math.random() * 30) + 40, // 40-70%
              vibration: Math.floor(Math.random() * 100),
            },
          },
        });
      }
    }

    console.log('✅ Equipment usage data seeded successfully!');
  } catch (error) {
    console.error('❌ Error seeding equipment usage:', error);
  } finally {
    await prisma.$disconnect();
  }
}

seedEquipmentUsage();


