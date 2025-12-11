const cron = require('node-cron');
const axios = require('axios');
const { prisma } = require('../lib/prisma');
const notificationService = require('../services/notification.service.js');

if (!process.env.MEMBER_SERVICE_URL) {
  throw new Error(
    'MEMBER_SERVICE_URL environment variable is required. Please set it in your .env file.'
  );
}
const MEMBER_SERVICE_URL = process.env.MEMBER_SERVICE_URL;

let expirationJob = null;

/**
 * Update expired subscriptions status from ACTIVE to EXPIRED
 * Runs daily at 1 AM (before revenue report at 2 AM)
 */
async function updateExpiredSubscriptions() {
  console.log('[SUBSCRIPTION EXPIRATION] Running subscription expiration job...');

  try {
    const now = new Date();

    // Find all ACTIVE subscriptions that have expired
    // Check both current_period_end and end_date
    const expiredSubscriptions = await prisma.subscription.findMany({
      where: {
        status: 'ACTIVE',
        OR: [
          {
            current_period_end: {
              lt: now,
            },
          },
          {
            end_date: {
              lt: now,
            },
          },
        ],
      },
      include: {
        plan: {
          select: {
            name: true,
            type: true,
          },
        },
      },
    });

    if (expiredSubscriptions.length === 0) {
      console.log('[SUBSCRIPTION EXPIRATION] No expired subscriptions found');
      return {
        success: true,
        expiredCount: 0,
        subscriptions: [],
      };
    }

    console.log(
      `[SUBSCRIPTION EXPIRATION] Found ${expiredSubscriptions.length} expired subscription(s)`
    );

    // Update each subscription to EXPIRED status
    const updatePromises = expiredSubscriptions.map(async subscription => {
      try {
        const updated = await prisma.subscription.update({
          where: { id: subscription.id },
          data: {
            status: 'EXPIRED',
            updated_at: new Date(),
          },
        });

        console.log(
          `[SUBSCRIPTION EXPIRATION] Updated subscription ${subscription.id} (member: ${subscription.member_id}) to EXPIRED`
        );

        // Send notification to user about subscription expiration
        // Need to get user_id from member_id via member service
        try {
          let userId = subscription.member_id; // Fallback to member_id

          // Try to get user_id from member service
          try {
            // Try fetching by member ID first
            let memberResponse;
            try {
              memberResponse = await axios.get(
                `${MEMBER_SERVICE_URL}/api/members/${subscription.member_id}`,
                { timeout: 5000 }
              );
            } catch (idError) {
              // If 404, try fetching by user_id (member_id might be user_id)
              if (idError.response?.status === 404) {
                try {
                  memberResponse = await axios.get(
                    `${MEMBER_SERVICE_URL}/api/members/user/${subscription.member_id}`,
                    { timeout: 5000 }
                  );
                } catch (userIdError) {
                  throw idError; // Throw original error if both fail
                }
              } else {
                throw idError;
              }
            }

            if (memberResponse?.data?.success && memberResponse.data.data) {
              // Member service returns { success: true, data: { member: {...} } or data: {...} }
              const memberData = memberResponse.data.data.member || memberResponse.data.data;
              if (memberData) {
                // Try to get user_id from member data
                userId = memberData.user_id || memberData.id || subscription.member_id;
              }
            }
          } catch (memberError) {
            // If member service call fails, use member_id as fallback
            console.warn(
              `[SUBSCRIPTION EXPIRATION] Could not fetch user_id for member ${subscription.member_id}, using member_id as fallback:`,
              memberError.message
            );
          }

          // Send notification using subscription notification method
          await notificationService.createSubscriptionNotification({
            userId: userId,
            subscriptionId: subscription.id,
            planName: subscription.plan?.name || 'thành viên',
            planType: subscription.plan?.type || 'BASIC',
            action: 'expired',
          });

          console.log(
            `[SUBSCRIPTION EXPIRATION] Notification sent for subscription ${subscription.id} (user: ${userId})`
          );
        } catch (notificationError) {
          console.error(
            `[SUBSCRIPTION EXPIRATION] Failed to send notification for subscription ${subscription.id}:`,
            notificationError
          );
          // Don't fail the job if notification fails
        }

        return updated;
      } catch (error) {
        console.error(
          `[SUBSCRIPTION EXPIRATION] Failed to update subscription ${subscription.id}:`,
          error
        );
        return null;
      }
    });

    const results = await Promise.all(updatePromises);
    const successfulUpdates = results.filter(r => r !== null);

    console.log(
      `[SUCCESS] Subscription expiration job completed: ${successfulUpdates.length}/${expiredSubscriptions.length} subscriptions updated`
    );

    return {
      success: true,
      expiredCount: successfulUpdates.length,
      subscriptions: successfulUpdates.map(s => ({
        id: s.id,
        member_id: s.member_id,
      })),
    };
  } catch (error) {
    console.error('[ERROR] Subscription expiration job error:', error);
    return {
      success: false,
      error: error.message,
      expiredCount: 0,
      subscriptions: [],
    };
  }
}

/**
 * Start the subscription expiration cron job
 * Runs daily at 1 AM (before revenue report at 2 AM)
 */
function startExpirationJob() {
  if (expirationJob) {
    console.log('[WARNING] Subscription expiration job is already running');
    return;
  }

  // Run daily at 1 AM
  expirationJob = cron.schedule('0 1 * * *', async () => {
    await updateExpiredSubscriptions();
  });

  console.log('[SUCCESS] Subscription expiration job started (runs daily at 1 AM)');
}

/**
 * Stop the subscription expiration cron job
 */
function stopExpirationJob() {
  if (expirationJob) {
    expirationJob.stop();
    expirationJob = null;
    console.log('[STOP] Subscription expiration job stopped');
  }
}

/**
 * Manually trigger the expiration job (for testing)
 */
async function runExpirationJob() {
  return await updateExpiredSubscriptions();
}

module.exports = {
  startExpirationJob,
  stopExpirationJob,
  runExpirationJob,
  updateExpiredSubscriptions,
};



