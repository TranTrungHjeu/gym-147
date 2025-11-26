require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const cacheService = require('../services/cache.service');
const cron = require('node-cron');

const prisma = new PrismaClient();

/**
 * Cache Warming Job for Member Service
 * Preloads frequently accessed data into Redis cache:
 * - Active members
 * - Equipment status
 * - Popular equipment queue states
 */
class CacheWarmingJob {
  constructor() {
    this.isRunning = false;
  }

  /**
   * Warm active members cache
   * Preloads active members with their basic info
   */
  async warmActiveMembers() {
    try {
      console.log('🔥 [CACHE WARMING] Starting to warm active members cache...');

      // Get all active members
      const activeMembers = await prisma.member.findMany({
        where: {
          membership_status: 'ACTIVE',
        },
        select: {
          id: true,
          user_id: true,
          membership_number: true,
          full_name: true,
          email: true,
          phone: true,
          membership_status: true,
          membership_type: true,
          profile_photo: true,
          access_enabled: true,
        },
        take: 1000, // Limit to first 1000 active members
      });

      console.log(`📊 [CACHE WARMING] Found ${activeMembers.length} active members`);

      // Cache each member individually
      let cachedCount = 0;
      for (const member of activeMembers) {
        const cacheKey = cacheService.generateKey('member', member.id, { basic: true });
        const cached = await cacheService.set(cacheKey, member, 3600); // 1 hour TTL
        if (cached) cachedCount++;
      }

      // Also cache the list of active member IDs
      const activeMemberIds = activeMembers.map(m => m.id);
      await cacheService.set('members:active:ids', activeMemberIds, 3600);

      console.log(`✅ [CACHE WARMING] Cached ${cachedCount}/${activeMembers.length} active members`);
      return { success: true, cached: cachedCount, total: activeMembers.length };
    } catch (error) {
      console.error('❌ [CACHE WARMING] Error warming active members:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Warm equipment status cache
   * Preloads all equipment with their current status
   */
  async warmEquipmentStatus() {
    try {
      console.log('🔥 [CACHE WARMING] Starting to warm equipment status cache...');

      // Get all equipment
      const equipment = await prisma.equipment.findMany({
        select: {
          id: true,
          name: true,
          category: true,
          status: true,
          location: true,
          brand: true,
          model: true,
          serial_number: true,
        },
      });

      console.log(`📊 [CACHE WARMING] Found ${equipment.length} equipment items`);

      // Cache each equipment individually
      let cachedCount = 0;
      for (const eq of equipment) {
        const cacheKey = cacheService.generateKey('equipment', eq.id, { status: true });
        const cached = await cacheService.set(cacheKey, eq, 1800); // 30 minutes TTL
        if (cached) cachedCount++;
      }

      // Cache equipment by status
      const equipmentByStatus = equipment.reduce((acc, eq) => {
        if (!acc[eq.status]) acc[eq.status] = [];
        acc[eq.status].push(eq);
        return acc;
      }, {});

      for (const [status, items] of Object.entries(equipmentByStatus)) {
        await cacheService.set(`equipment:status:${status}`, items, 1800);
      }

      // Cache equipment by category
      const equipmentByCategory = equipment.reduce((acc, eq) => {
        if (!acc[eq.category]) acc[eq.category] = [];
        acc[eq.category].push(eq);
        return acc;
      }, {});

      for (const [category, items] of Object.entries(equipmentByCategory)) {
        await cacheService.set(`equipment:category:${category}`, items, 1800);
      }

      console.log(`✅ [CACHE WARMING] Cached ${cachedCount}/${equipment.length} equipment items`);
      return { success: true, cached: cachedCount, total: equipment.length };
    } catch (error) {
      console.error('❌ [CACHE WARMING] Error warming equipment status:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Warm popular equipment queue states
   * Preloads queue information for equipment that frequently has queues
   */
  async warmPopularQueueStates() {
    try {
      console.log('🔥 [CACHE WARMING] Starting to warm popular queue states...');

      // Get equipment with active queues (WAITING or NOTIFIED status)
      const equipmentWithQueues = await prisma.equipmentQueue.groupBy({
        by: ['equipment_id'],
        where: {
          status: { in: ['WAITING', 'NOTIFIED'] },
        },
        _count: {
          id: true,
        },
        orderBy: {
          _count: {
            id: 'desc',
          },
        },
        take: 20, // Top 20 equipment with queues
      });

      console.log(`📊 [CACHE WARMING] Found ${equipmentWithQueues.length} equipment with active queues`);

      let cachedCount = 0;
      for (const item of equipmentWithQueues) {
        const equipmentId = item.equipment_id;

        // Get queue length
        const queueLength = await prisma.equipmentQueue.count({
          where: {
            equipment_id: equipmentId,
            status: { in: ['WAITING', 'NOTIFIED'] },
          },
        });

        // Cache queue length
        const lengthCached = await cacheService.setQueueLength(equipmentId, queueLength, 300);
        if (lengthCached) cachedCount++;

        // Get queue list
        const queueList = await prisma.equipmentQueue.findMany({
          where: {
            equipment_id: equipmentId,
            status: { in: ['WAITING', 'NOTIFIED'] },
          },
          include: {
            member: {
              select: {
                id: true,
                full_name: true,
                profile_photo: true,
              },
            },
          },
          orderBy: { position: 'asc' },
        });

        // Cache queue list
        await cacheService.setQueueList(equipmentId, queueList, 300);
      }

      console.log(`✅ [CACHE WARMING] Cached queue states for ${cachedCount} equipment`);
      return { success: true, cached: cachedCount, total: equipmentWithQueues.length };
    } catch (error) {
      console.error('❌ [CACHE WARMING] Error warming queue states:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Run all cache warming tasks
   */
  async run() {
    if (this.isRunning) {
      console.log('⚠️ [CACHE WARMING] Job is already running, skipping...');
      return;
    }

    this.isRunning = true;
    const startTime = Date.now();

    try {
      console.log('🚀 [CACHE WARMING] ========== STARTING CACHE WARMING ==========');

      const results = {
        activeMembers: await this.warmActiveMembers(),
        equipmentStatus: await this.warmEquipmentStatus(),
        queueStates: await this.warmPopularQueueStates(),
      };

      const duration = ((Date.now() - startTime) / 1000).toFixed(2);
      console.log(`✅ [CACHE WARMING] ========== CACHE WARMING COMPLETED (${duration}s) ==========`);
      console.log('📊 [CACHE WARMING] Results:', JSON.stringify(results, null, 2));

      return results;
    } catch (error) {
      console.error('❌ [CACHE WARMING] Fatal error during cache warming:', error);
      return { success: false, error: error.message };
    } finally {
      this.isRunning = false;
    }
  }

  /**
   * Start scheduled cache warming
   * Runs every hour at minute 0
   */
  startScheduled() {
    // Run every hour at minute 0 (e.g., 1:00, 2:00, 3:00)
    cron.schedule('0 * * * *', async () => {
      console.log('⏰ [CACHE WARMING] Scheduled cache warming triggered');
      await this.run();
    });

    // Also run immediately on startup (after 30 seconds delay to let services initialize)
    setTimeout(async () => {
      console.log('🚀 [CACHE WARMING] Running initial cache warming...');
      await this.run();
    }, 30000); // 30 seconds delay

    console.log('✅ [CACHE WARMING] Scheduled cache warming started (runs every hour)');
  }
}

// Create singleton instance
const cacheWarmingJob = new CacheWarmingJob();

// Export for manual execution
module.exports = cacheWarmingJob;

// If this file is run directly, start the job
if (require.main === module) {
  cacheWarmingJob.run()
    .then(() => {
      console.log('✅ Cache warming completed');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Cache warming failed:', error);
      process.exit(1);
    });
}

