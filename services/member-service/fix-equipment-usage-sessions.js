const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function fixEquipmentUsageSessions() {
  try {
    console.log('🔧 Fixing equipment usage session links...');

    // Get all equipment usage without session_id
    const equipmentUsages = await prisma.equipmentUsage.findMany({
      where: {
        session_id: null,
      },
      include: {
        member: true,
      },
    });

    console.log(`Found ${equipmentUsages.length} equipment usages without session_id`);

    // Get all gym sessions
    const sessions = await prisma.gymSession.findMany({
      orderBy: { entry_time: 'desc' },
    });

    console.log(`Found ${sessions.length} gym sessions`);

    // Group equipment usage by member
    const usageByMember = {};
    equipmentUsages.forEach(usage => {
      if (!usageByMember[usage.member_id]) {
        usageByMember[usage.member_id] = [];
      }
      usageByMember[usage.member_id].push(usage);
    });

    // For each member, try to match equipment usage with sessions
    for (const [memberId, usages] of Object.entries(usageByMember)) {
      const memberSessions = sessions.filter(s => s.member_id === memberId);

      if (memberSessions.length === 0) {
        console.log(`No sessions found for member ${memberId}`);
        continue;
      }

      // Sort usages by start_time
      usages.sort((a, b) => new Date(a.start_time) - new Date(b.start_time));

      // Sort sessions by entry_time
      memberSessions.sort((a, b) => new Date(a.entry_time) - new Date(b.entry_time));

      // Match each usage with the closest session
      for (const usage of usages) {
        const usageTime = new Date(usage.start_time);

        // Find the session that contains this usage time
        let bestSession = null;
        let minTimeDiff = Infinity;

        for (const session of memberSessions) {
          const sessionStart = new Date(session.entry_time);
          const sessionEnd = session.exit_time
            ? new Date(session.exit_time)
            : new Date(sessionStart.getTime() + 24 * 60 * 60 * 1000); // If no exit time, assume 24h later

          // Check if usage time is within session time
          if (usageTime >= sessionStart && usageTime <= sessionEnd) {
            const timeDiff = Math.abs(usageTime - sessionStart);
            if (timeDiff < minTimeDiff) {
              minTimeDiff = timeDiff;
              bestSession = session;
            }
          }
        }

        // If no session found, assign to the most recent session
        if (!bestSession && memberSessions.length > 0) {
          bestSession = memberSessions[memberSessions.length - 1];
        }

        if (bestSession) {
          await prisma.equipmentUsage.update({
            where: { id: usage.id },
            data: { session_id: bestSession.id },
          });
          console.log(`✅ Linked usage ${usage.id} to session ${bestSession.id}`);
        }
      }
    }

    console.log('✅ Equipment usage session links fixed successfully!');
  } catch (error) {
    console.error('❌ Error fixing equipment usage sessions:', error);
  } finally {
    await prisma.$disconnect();
  }
}

fixEquipmentUsageSessions();


