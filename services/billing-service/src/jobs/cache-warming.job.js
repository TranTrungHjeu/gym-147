require('dotenv').config();
const { prisma } = require('../lib/prisma.js');
const redisService = require('../services/redis.service.js');
const cron = require('node-cron');

/**
 * Cache Warming Job for Billing Service
 * Preloads frequently accessed data into Redis cache:
 * - Membership plans (all active plans)
 * - Featured plans
 * - Popular plans (most subscribed)
 */
class CacheWarmingJob {
  constructor() {
    this.isRunning = false;
  }

  /**
   * Warm membership plans cache
   * Preloads all active membership plans
   */
  async warmMembershipPlans() {
    try {
      console.log('🔥 [CACHE WARMING] Starting to warm membership plans cache...');

      // Get all active membership plans
      const plans = await prisma.membershipPlan.findMany({
        where: {
          is_active: true,
        },
        include: {
          plan_addons: {
            where: { is_active: true },
          },
        },
        orderBy: { created_at: 'desc' },
      });

      console.log(`📊 [CACHE WARMING] Found ${plans.length} active membership plans`);

      // Cache each plan individually
      let cachedCount = 0;
      for (const plan of plans) {
        const cacheKey = `plan:${plan.id}`;
        const cached = await this.setCache(cacheKey, plan, 3600); // 1 hour TTL
        if (cached) cachedCount++;
      }

      // Cache all plans list
      await this.setCache('plans:all', plans, 3600);

      // Cache featured plans
      const featuredPlans = plans.filter(p => p.is_featured);
      await this.setCache('plans:featured', featuredPlans, 3600);

      // Cache plans by type
      const plansByType = plans.reduce((acc, plan) => {
        if (!acc[plan.type]) acc[plan.type] = [];
        acc[plan.type].push(plan);
        return acc;
      }, {});

      for (const [type, typePlans] of Object.entries(plansByType)) {
        await this.setCache(`plans:type:${type}`, typePlans, 3600);
      }

      console.log(`✅ [CACHE WARMING] Cached ${cachedCount}/${plans.length} membership plans`);
      return { success: true, cached: cachedCount, total: plans.length };
    } catch (error) {
      console.error('❌ [CACHE WARMING] Error warming membership plans:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Warm popular plans cache
   * Preloads plans that are most subscribed
   */
  async warmPopularPlans() {
    try {
      console.log('🔥 [CACHE WARMING] Starting to warm popular plans cache...');

      // Get plans with most active subscriptions
      const popularPlans = await prisma.subscription.groupBy({
        by: ['plan_id'],
        where: {
          status: 'ACTIVE',
        },
        _count: {
          id: true,
        },
        orderBy: {
          _count: {
            id: 'desc',
          },
        },
        take: 10, // Top 10 most subscribed plans
      });

      const planIds = popularPlans.map(pp => pp.plan_id);

      // Get plan details
      const plans = await prisma.membershipPlan.findMany({
        where: {
          id: { in: planIds },
          is_active: true,
        },
        include: {
          plan_addons: {
            where: { is_active: true },
          },
        },
      });

      console.log(`📊 [CACHE WARMING] Found ${plans.length} popular plans`);

      // Cache popular plans list
      await this.setCache('plans:popular', plans, 3600);

      console.log(`✅ [CACHE WARMING] Cached ${plans.length} popular plans`);
      return { success: true, cached: plans.length, total: plans.length };
    } catch (error) {
      console.error('❌ [CACHE WARMING] Error warming popular plans:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Helper method to set cache using redisService
   */
  async setCache(key, value, ttl) {
    try {
      // Use redisService if available, otherwise return false
      if (!redisService || !redisService.isConnected || !redisService.client) {
        return false;
      }

      const serialized = JSON.stringify(value);
      await redisService.client.setEx(key, ttl, serialized);
      return true;
    } catch (error) {
      console.error(`❌ [CACHE WARMING] Error setting cache for key ${key}:`, error);
      return false;
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
        membershipPlans: await this.warmMembershipPlans(),
        popularPlans: await this.warmPopularPlans(),
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

