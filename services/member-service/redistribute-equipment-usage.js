const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function redistributeEquipmentUsage() {
  try {
    console.log('🔄 Redistributing equipment usage to correct sessions...');

    // Get all members
    const members = await prisma.member.findMany({
      select: { id: true, full_name: true },
    });

    console.log(`Found ${members.length} members`);

    for (const member of members) {
      console.log(`\n👤 Processing member: ${member.full_name}`);

      // Get all sessions for this member, ordered by entry_time
      const sessions = await prisma.gymSession.findMany({
        where: { member_id: member.id },
        orderBy: { entry_time: 'asc' },
      });

      console.log(`  📅 Found ${sessions.length} sessions`);

      if (sessions.length === 0) continue;

      // Get all equipment usage for this member
      const equipmentUsages = await prisma.equipmentUsage.findMany({
        where: { member_id: member.id },
        orderBy: { start_time: 'asc' },
      });

      console.log(`  🏋️ Found ${equipmentUsages.length} equipment usages`);

      // Clear existing session_id for this member
      await prisma.equipmentUsage.updateMany({
        where: { member_id: member.id },
        data: { session_id: null },
      });

      // Redistribute equipment usage to correct sessions
      for (const usage of equipmentUsages) {
        const usageTime = new Date(usage.start_time);

        // Find the session that contains this usage time
        let bestSession = null;
        let minTimeDiff = Infinity;

        for (const session of sessions) {
          const sessionStart = new Date(session.entry_time);
          const sessionEnd = session.exit_time
            ? new Date(session.exit_time)
            : new Date(sessionStart.getTime() + 4 * 60 * 60 * 1000); // Assume 4 hours max if no exit time

          // Check if usage time is within session time
          if (usageTime >= sessionStart && usageTime <= sessionEnd) {
            const timeDiff = Math.abs(usageTime - sessionStart);
            if (timeDiff < minTimeDiff) {
              minTimeDiff = timeDiff;
              bestSession = session;
            }
          }
        }

        // If no session found, assign to the closest session
        if (!bestSession) {
          for (const session of sessions) {
            const sessionStart = new Date(session.entry_time);
            const timeDiff = Math.abs(usageTime - sessionStart);
            if (timeDiff < minTimeDiff) {
              minTimeDiff = timeDiff;
              bestSession = session;
            }
          }
        }

        if (bestSession) {
          await prisma.equipmentUsage.update({
            where: { id: usage.id },
            data: { session_id: bestSession.id },
          });
          console.log(
            `    ✅ Linked usage ${usage.id.substring(
              0,
              8
            )}... to session ${bestSession.id.substring(0, 8)}... (${
              bestSession.entry_time.toISOString().split('T')[0]
            })`
          );
        }
      }
    }

    console.log('\n✅ Equipment usage redistribution completed successfully!');
  } catch (error) {
    console.error('❌ Error redistributing equipment usage:', error);
  } finally {
    await prisma.$disconnect();
  }
}

redistributeEquipmentUsage();



