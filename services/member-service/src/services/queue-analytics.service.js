/**
 * Queue Analytics Service
 * Tracks queue metrics and provides predictions
 */

const { prisma } = require('../lib/prisma');

class QueueAnalyticsService {
  /**
   * Get queue analytics for an equipment
   * @param {string} equipmentId - Equipment ID
   * @returns {Promise<Object>} Analytics data
   */
  async getQueueAnalytics(equipmentId) {
    try {
      // Get current queue
      const currentQueue = await prisma.equipmentQueue.findMany({
        where: {
          equipment_id: equipmentId,
          status: { in: ['WAITING', 'NOTIFIED'] },
        },
        orderBy: {
          position: 'asc',
        },
        include: {
          equipment: true,
        },
      });

      // Get historical usage data for average duration calculation
      const historicalUsages = await prisma.equipmentUsage.findMany({
        where: {
          equipment_id: equipmentId,
          end_time: { not: null },
          duration: { not: null },
        },
        orderBy: {
          end_time: 'desc',
        },
        take: 100, // Last 100 sessions
        select: {
          duration: true,
          start_time: true,
          end_time: true,
        },
      });

      // Calculate average duration (in minutes)
      let avgDuration = 30; // Default 30 minutes if no history
      if (historicalUsages.length > 0) {
        const totalDuration = historicalUsages.reduce((sum, usage) => {
          // Duration is stored in minutes, ensure it's a valid number
          const duration = usage.duration || 0;
          return sum + Math.max(0, duration);
        }, 0);
        avgDuration = totalDuration / historicalUsages.length;
      }

      // Get current active usage
      const activeUsage = await prisma.equipmentUsage.findFirst({
        where: {
          equipment_id: equipmentId,
          end_time: null,
        },
        select: {
          start_time: true,
          auto_end_at: true,
        },
      });

      // Calculate estimated wait time for each position
      const queueWithEstimates = currentQueue.map((entry, index) => {
        let estimatedWaitTime = 0;

        // If there's active usage, calculate time until it ends
        if (activeUsage && index === 0) {
          const timeUntilEnd = activeUsage.auto_end_at
            ? Math.max(0, (new Date(activeUsage.auto_end_at) - new Date()) / (1000 * 60)) // minutes
            : avgDuration;
          estimatedWaitTime = timeUntilEnd;
        } else {
          // For others, estimate based on average duration and position
          const peopleAhead = index;
          estimatedWaitTime = peopleAhead * avgDuration;
          
          // Add time for current user if exists
          if (activeUsage && index > 0) {
            const timeUntilEnd = activeUsage.auto_end_at
              ? Math.max(0, (new Date(activeUsage.auto_end_at) - new Date()) / (1000 * 60))
              : avgDuration;
            estimatedWaitTime += timeUntilEnd;
          }
        }

        return {
          ...entry,
          estimated_wait_time_minutes: Math.round(estimatedWaitTime),
        };
      });

      // Calculate average wait time from historical data
      // Use COMPLETED status entries to calculate wait time from joined_at to notified_at (or updated_at if notified_at is null)
      const recentQueueEntries = await prisma.equipmentQueue.findMany({
        where: {
          equipment_id: equipmentId,
          status: 'COMPLETED',
          updated_at: {
            gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), // Last 7 days
          },
        },
        select: {
          joined_at: true,
          notified_at: true,
          updated_at: true,
        },
      });

      // Calculate average wait time from historical data
      let avgWaitTime = 0;
      if (recentQueueEntries.length > 0) {
        const totalWaitTime = recentQueueEntries.reduce((sum, entry) => {
          // Wait time is from joined_at to when they were notified (or updated_at if not notified)
          const claimTime = entry.notified_at 
            ? new Date(entry.notified_at) 
            : new Date(entry.updated_at);
          const joinedTime = new Date(entry.joined_at);
          const waitTime = (claimTime - joinedTime) / (1000 * 60); // minutes
          // Only count positive wait times (should always be positive, but safety check)
          return sum + Math.max(0, waitTime);
        }, 0);
        avgWaitTime = totalWaitTime / recentQueueEntries.length;
      } else {
        // If no historical queue data, use average duration as fallback
        // This assumes wait time ≈ usage duration when no queue exists
        avgWaitTime = avgDuration;
      }

      return {
        success: true,
        data: {
          equipment_id: equipmentId,
          current_queue_length: currentQueue.length,
          queue: queueWithEstimates,
          analytics: {
            average_duration_minutes: Math.round(avgDuration),
            average_wait_time_minutes: Math.round(avgWaitTime),
            historical_sessions_count: historicalUsages.length,
            active_usage: activeUsage ? {
              start_time: activeUsage.start_time,
              estimated_end_time: activeUsage.auto_end_at,
            } : null,
          },
        },
      };
    } catch (error) {
      console.error('[ERROR] Queue analytics error:', error);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Predict equipment availability time
   * @param {string} equipmentId - Equipment ID
   * @returns {Promise<Object>} Prediction data
   */
  async predictEquipmentAvailability(equipmentId) {
    try {
      // Get current active usage
      const activeUsage = await prisma.equipmentUsage.findFirst({
        where: {
          equipment_id: equipmentId,
          end_time: null,
        },
        include: {
          equipment: true,
        },
      });

      if (!activeUsage) {
        return {
          success: true,
          data: {
            equipment_id: equipmentId,
            available_now: true,
            estimated_available_at: new Date(),
          },
        };
      }

      // Get queue
      const queue = await prisma.equipmentQueue.findMany({
        where: {
          equipment_id: equipmentId,
          status: { in: ['WAITING', 'NOTIFIED'] },
        },
        orderBy: {
          position: 'asc',
        },
        take: 1, // Only need first person
      });

      // Calculate estimated availability
      const autoEndAt = activeUsage.auto_end_at || new Date(Date.now() + 3 * 60 * 60 * 1000); // Default 3 hours
      const timeUntilEnd = Math.max(0, (new Date(autoEndAt) - new Date()) / (1000 * 60)); // minutes

      // If there's someone in queue, they'll use it after current user
      let estimatedAvailableAt = new Date(autoEndAt);
      if (queue.length > 0) {
        // Get average duration for next user
        const historicalUsages = await prisma.equipmentUsage.findMany({
          where: {
            equipment_id: equipmentId,
            end_time: { not: null },
            duration: { not: null },
          },
          orderBy: {
            end_time: 'desc',
          },
          take: 50,
          select: {
            duration: true,
          },
        });

        const avgDuration = historicalUsages.length > 0
          ? historicalUsages.reduce((sum, usage) => sum + (usage.duration || 0), 0) / historicalUsages.length
          : 30; // Default 30 minutes

        estimatedAvailableAt = new Date(new Date(autoEndAt).getTime() + avgDuration * 60 * 1000);
      }

      return {
        success: true,
        data: {
          equipment_id: equipmentId,
          equipment_name: activeUsage.equipment.name,
          available_now: false,
          current_user: {
            member_id: activeUsage.member_id,
            start_time: activeUsage.start_time,
            estimated_end_time: autoEndAt,
            time_remaining_minutes: Math.round(timeUntilEnd),
          },
          queue_length: queue.length,
          estimated_available_at: estimatedAvailableAt,
          estimated_wait_time_minutes: Math.round((estimatedAvailableAt - new Date()) / (1000 * 60)),
        },
      };
    } catch (error) {
      console.error('[ERROR] Equipment availability prediction error:', error);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Get queue position prediction
   * @param {string} equipmentId - Equipment ID
   * @param {number} position - Current position in queue
   * @returns {Promise<Object>} Prediction data
   */
  async predictQueuePosition(equipmentId, position) {
    try {
      // Get historical data
      const historicalUsages = await prisma.equipmentUsage.findMany({
        where: {
          equipment_id: equipmentId,
          end_time: { not: null },
          duration: { not: null },
        },
        orderBy: {
          end_time: 'desc',
        },
        take: 100,
        select: {
          duration: true,
        },
      });

      const avgDuration = historicalUsages.length > 0
        ? historicalUsages.reduce((sum, usage) => sum + (usage.duration || 0), 0) / historicalUsages.length
        : 30; // Default 30 minutes

      // Get current active usage
      const activeUsage = await prisma.equipmentUsage.findFirst({
        where: {
          equipment_id: equipmentId,
          end_time: null,
        },
        select: {
          auto_end_at: true,
        },
      });

      // Calculate estimated time until your turn
      let estimatedTimeMinutes = 0;

      if (activeUsage) {
        const timeUntilCurrentEnds = activeUsage.auto_end_at
          ? Math.max(0, (new Date(activeUsage.auto_end_at) - new Date()) / (1000 * 60))
          : avgDuration;
        
        // Add time for people ahead in queue
        const peopleAhead = position - 1;
        estimatedTimeMinutes = timeUntilCurrentEnds + (peopleAhead * avgDuration);
      } else {
        // No active usage, estimate based on position
        estimatedTimeMinutes = (position - 1) * avgDuration;
      }

      return {
        success: true,
        data: {
          equipment_id: equipmentId,
          current_position: position,
          estimated_wait_time_minutes: Math.round(estimatedTimeMinutes),
          estimated_turn_at: new Date(Date.now() + estimatedTimeMinutes * 60 * 1000),
          average_duration_minutes: Math.round(avgDuration),
        },
      };
    } catch (error) {
      console.error('[ERROR] Queue position prediction error:', error);
      return {
        success: false,
        error: error.message,
      };
    }
  }
}

module.exports = new QueueAnalyticsService();

