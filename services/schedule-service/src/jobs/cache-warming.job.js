require('dotenv').config();
const cacheService = require('../services/cache.service');
const cron = require('node-cron');
// Use the shared Prisma client from lib/prisma.js
const { prisma } = require('../lib/prisma');

/**
 * Cache Warming Job for Schedule Service
 * Preloads frequently accessed data into Redis cache:
 * - Popular classes (most booked)
 * - Trainer schedules (upcoming schedules for active trainers)
 * - Upcoming schedules by category
 */
class CacheWarmingJob {
  constructor() {
    this.isRunning = false;
  }

  /**
   * Warm popular classes cache
   * Preloads classes that are frequently booked
   */
  async warmPopularClasses() {
    try {
      console.log('[CACHE] [CACHE WARMING] Starting to warm popular classes cache...');

      // Get classes with most bookings in the last 30 days
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const popularClasses = await prisma.booking.groupBy({
        by: ['schedule_id'],
        where: {
          created_at: { gte: thirtyDaysAgo },
          status: { in: ['CONFIRMED', 'COMPLETED'] },
        },
        _count: {
          id: true,
        },
        orderBy: {
          _count: {
            id: 'desc',
          },
        },
        take: 50, // Top 50 most booked classes
      });

      // Get schedule IDs
      const scheduleIds = popularClasses.map(pc => pc.schedule_id);
      
      // Get unique class IDs from schedules
      const schedules = await prisma.schedule.findMany({
        where: {
          id: { in: scheduleIds },
        },
        select: {
          class_id: true,
        },
      });

      const classIds = [...new Set(schedules.map(s => s.class_id))];

      // Get class details
      const classes = await prisma.gymClass.findMany({
        where: {
          id: { in: classIds },
          is_active: true,
        },
        select: {
          id: true,
          name: true,
          description: true,
          category: true,
          difficulty: true,
          duration: true,
          price: true,
          max_capacity: true,
          thumbnail: true,
        },
        take: 50,
      });

      console.log(`[DATA] [CACHE WARMING] Found ${classes.length} popular classes`);

      // Cache each class individually
      let cachedCount = 0;
      for (const gymClass of classes) {
        const cacheKey = cacheService.generateKey('class', gymClass.id, { popular: true });
        const cached = await cacheService.set(cacheKey, gymClass, 3600); // 1 hour TTL
        if (cached) cachedCount++;
      }

      // Cache popular classes list
      await cacheService.set('classes:popular', classes, 3600);

      console.log(`[SUCCESS] [CACHE WARMING] Cached ${cachedCount}/${classes.length} popular classes`);
      return { success: true, cached: cachedCount, total: classes.length };
    } catch (error) {
      console.error('[ERROR] [CACHE WARMING] Error warming popular classes:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Warm trainer schedules cache
   * Preloads upcoming schedules for active trainers
   */
  async warmTrainerSchedules() {
    try {
      console.log('[CACHE] [CACHE WARMING] Starting to warm trainer schedules cache...');

      const now = new Date();
      const nextWeek = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

      // Get active trainers
      const activeTrainers = await prisma.trainer.findMany({
        where: {
          status: 'ACTIVE',
        },
        select: {
          id: true,
          user_id: true,
          full_name: true,
        },
        take: 100, // Limit to first 100 active trainers
      });

      console.log(`[DATA] [CACHE WARMING] Found ${activeTrainers.length} active trainers`);

      let totalCached = 0;
      for (const trainer of activeTrainers) {
        // Get upcoming schedules for this trainer
        const schedules = await prisma.schedule.findMany({
          where: {
            trainer_id: trainer.id,
            start_time: {
              gte: now,
              lte: nextWeek,
            },
            status: 'SCHEDULED',
          },
          include: {
            gym_class: {
              select: {
                id: true,
                name: true,
                category: true,
                difficulty: true,
                duration: true,
              },
            },
            room: {
              select: {
                id: true,
                name: true,
                capacity: true,
              },
            },
            bookings: {
              where: { status: 'CONFIRMED' },
              select: { id: true },
            },
          },
          orderBy: { start_time: 'asc' },
          take: 50, // Limit to 50 upcoming schedules per trainer
        });

        if (schedules.length > 0) {
          const cacheKey = cacheService.generateKey('trainer:schedules', trainer.id, { upcoming: true });
          const cached = await cacheService.set(cacheKey, schedules, 1800); // 30 minutes TTL
          if (cached) totalCached++;
        }
      }

      console.log(`[SUCCESS] [CACHE WARMING] Cached schedules for ${totalCached} trainers`);
      return { success: true, cached: totalCached, total: activeTrainers.length };
    } catch (error) {
      console.error('[ERROR] [CACHE WARMING] Error warming trainer schedules:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Warm upcoming schedules by category
   * Preloads upcoming schedules grouped by category
   */
  async warmUpcomingSchedulesByCategory() {
    try {
      console.log('[CACHE] [CACHE WARMING] Starting to warm upcoming schedules by category...');

      const now = new Date();
      const nextWeek = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

      // Get all active classes with their categories
      const classes = await prisma.gymClass.findMany({
        where: {
          is_active: true,
        },
        select: {
          id: true,
          category: true,
        },
      });

      const categories = [...new Set(classes.map(c => c.category))];

      let totalCached = 0;
      for (const category of categories) {
        // Get upcoming schedules for this category
        const schedules = await prisma.schedule.findMany({
          where: {
            start_time: {
              gte: now,
              lte: nextWeek,
            },
            status: 'SCHEDULED',
            gym_class: {
              category: category,
              is_active: true,
            },
          },
          include: {
            gym_class: {
              select: {
                id: true,
                name: true,
                category: true,
                difficulty: true,
                duration: true,
              },
            },
            trainer: {
              select: {
                id: true,
                full_name: true,
                profile_photo: true,
              },
            },
            room: {
              select: {
                id: true,
                name: true,
                capacity: true,
              },
            },
            bookings: {
              where: { status: 'CONFIRMED' },
              select: { id: true },
            },
          },
          orderBy: { start_time: 'asc' },
          take: 100, // Limit to 100 schedules per category
        });

        if (schedules.length > 0) {
          const cacheKey = `schedules:category:${category}`;
          const cached = await cacheService.set(cacheKey, schedules, 1800); // 30 minutes TTL
          if (cached) totalCached++;
        }
      }

      console.log(`[SUCCESS] [CACHE WARMING] Cached schedules for ${totalCached} categories`);
      return { success: true, cached: totalCached, total: categories.length };
    } catch (error) {
      console.error('[ERROR] [CACHE WARMING] Error warming schedules by category:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Run all cache warming tasks
   */
  async run() {
    if (this.isRunning) {
      console.log('[WARN] [CACHE WARMING] Job is already running, skipping...');
      return;
    }

    this.isRunning = true;
    const startTime = Date.now();

    try {
      console.log('[START] [CACHE WARMING] ========== STARTING CACHE WARMING ==========');

      const results = {
        popularClasses: await this.warmPopularClasses(),
        trainerSchedules: await this.warmTrainerSchedules(),
        schedulesByCategory: await this.warmUpcomingSchedulesByCategory(),
      };

      const duration = ((Date.now() - startTime) / 1000).toFixed(2);
      console.log(`[SUCCESS] [CACHE WARMING] ========== CACHE WARMING COMPLETED (${duration}s) ==========`);
      console.log('[DATA] [CACHE WARMING] Results:', JSON.stringify(results, null, 2));

      return results;
    } catch (error) {
      console.error('[ERROR] [CACHE WARMING] Fatal error during cache warming:', error);
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
      console.log('[TIMER] [CACHE WARMING] Scheduled cache warming triggered');
      await this.run();
    });

    // Also run immediately on startup (after 30 seconds delay to let services initialize)
    setTimeout(async () => {
      console.log('[START] [CACHE WARMING] Running initial cache warming...');
      await this.run();
    }, 30000); // 30 seconds delay

    console.log('[SUCCESS] [CACHE WARMING] Scheduled cache warming started (runs every hour)');
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
      console.log('[SUCCESS] Cache warming completed');
      process.exit(0);
    })
    .catch((error) => {
      console.error('[ERROR] Cache warming failed:', error);
      process.exit(1);
    });
}

