const cron = require('node-cron');
const notificationService = require('../services/notification.service.js');
const rewardSocketHelper = require('../utils/reward-socket.helper.js');
// Use the shared Prisma client from lib/prisma.js
const { prisma } = require('../lib/prisma');

let notificationJob = null;

function startExpirationNotificationJob() {
  // Run every day at 9 AM
  notificationJob = cron.schedule('0 9 * * *', async () => {
    console.log('[BELL] Running reward expiration notification job...');
    try {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      tomorrow.setHours(0, 0, 0, 0);

      const dayAfter = new Date(tomorrow);
      dayAfter.setDate(dayAfter.getDate() + 1);

      // Find redemptions expiring in next 24 hours
      const expiringRedemptions = await prisma.rewardRedemption.findMany({
        where: {
          status: 'ACTIVE',
          expires_at: {
            gte: tomorrow,
            lt: dayAfter,
          },
        },
        include: {
          reward: true,
          member: {
            select: {
              id: true,
              full_name: true,
            },
          },
        },
      });

      // Send notifications
      let sentCount = 0;
      for (const redemption of expiringRedemptions) {
        try {
          await notificationService.sendNotification({
            userId: null,
            memberId: redemption.member_id,
            type: 'REWARD',
            title: 'Reward Sắp Hết Hạn!',
            message: `Reward "${redemption.reward.title}" của bạn sắp hết hạn vào ngày mai. Mã: ${redemption.code}`,
            data: {
              redemption_id: redemption.id,
              reward_id: redemption.reward_id,
              expires_at: redemption.expires_at,
            },
            channels: ['IN_APP', 'PUSH'],
          });

          // Emit socket event for real-time notification
          rewardSocketHelper
            .emitRewardExpired(redemption.member_id, {
              id: redemption.id,
              reward_id: redemption.reward_id,
              reward: {
                id: redemption.reward.id,
                title: redemption.reward.title,
              },
              code: redemption.code,
              expires_at: redemption.expires_at,
            })
            .catch((err) => console.error(`Socket emit error for redemption ${redemption.id}:`, err));

          sentCount++;
        } catch (error) {
          console.error(`Failed to send notification to member ${redemption.member_id}:`, error);
        }
      }

      console.log(`[SUCCESS] Sent expiration notifications to ${sentCount}/${expiringRedemptions.length} members`);
    } catch (error) {
      console.error('[ERROR] Expiration notification job error:', error);
    }
  });

  console.log('[SUCCESS] Reward expiration notification job started (runs daily at 9 AM)');
}

function stopExpirationNotificationJob() {
  if (notificationJob) {
    notificationJob.stop();
    notificationJob = null;
    console.log('[STOP] Reward expiration notification job stopped');
  }
}

module.exports = {
  startExpirationNotificationJob,
  stopExpirationNotificationJob,
};

