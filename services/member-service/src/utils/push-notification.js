const { PrismaClient } = require('@prisma/client');

// Connect to Identity Service database to get push tokens
const identityPrisma = new PrismaClient({
  datasources: {
    db: {
      url:
        process.env.IDENTITY_DATABASE_URL ||
        'postgresql://postgres:postgres@localhost:5432/identity_db',
    },
  },
});

/**
 * Send push notification to a specific user
 * @param {string} userId - User ID
 * @param {string} title - Notification title
 * @param {string} body - Notification body
 * @param {Object} data - Additional data payload
 * @returns {Promise<Object>} Result of push notification
 */
async function sendPushNotification(userId, title, body, data = {}) {
  try {
    // Get user's push token from identity service
    const user = await identityPrisma.user.findUnique({
      where: { id: userId },
      select: {
        push_token: true,
        push_enabled: true,
        push_platform: true,
      },
    });

    if (!user) {
      console.log(`❌ User not found: ${userId}`);
      return { success: false, error: 'User not found' };
    }

    if (!user.push_token) {
      console.log(`❌ No push token for user: ${userId}`);
      return { success: false, error: 'No push token' };
    }

    if (!user.push_enabled) {
      console.log(`❌ Push notifications disabled for user: ${userId}`);
      return { success: false, error: 'Push disabled' };
    }

    // Prepare Expo push message
    const message = {
      to: user.push_token,
      sound: 'default',
      title: title,
      body: body,
      data: data,
      badge: 1,
      priority: 'high',
      channelId: 'default',
    };

    // Send to Expo Push Notification Service
    const response = await fetch('https://exp.host/--/api/v2/push/send', {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(message),
    });

    const result = await response.json();

    if (result.data && result.data.status === 'ok') {
      console.log(`✅ Push notification sent to user ${userId}: ${title}`);
      return { success: true, result };
    } else {
      console.log(`⚠️ Push notification failed for user ${userId}:`, result);
      return { success: false, error: result };
    }
  } catch (error) {
    console.error('❌ Send push notification error:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Send push notification to multiple users
 * @param {string[]} userIds - Array of user IDs
 * @param {string} title - Notification title
 * @param {string} body - Notification body
 * @param {Object} data - Additional data payload
 * @returns {Promise<Object>} Results of push notifications
 */
async function sendBulkPushNotifications(userIds, title, body, data = {}) {
  try {
    // Get all users' push tokens
    const users = await identityPrisma.user.findMany({
      where: {
        id: { in: userIds },
        push_enabled: true,
        push_token: { not: null },
      },
      select: {
        id: true,
        push_token: true,
      },
    });

    if (users.length === 0) {
      console.log(`❌ No users with push tokens found`);
      return { success: false, sent: 0, total: userIds.length };
    }

    // Prepare messages
    const messages = users.map(user => ({
      to: user.push_token,
      sound: 'default',
      title: title,
      body: body,
      data: data,
      badge: 1,
      priority: 'high',
      channelId: 'default',
    }));

    // Send to Expo Push Notification Service
    const response = await fetch('https://exp.host/--/api/v2/push/send', {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(messages),
    });

    const result = await response.json();

    console.log(`✅ Bulk push notifications sent to ${users.length}/${userIds.length} users`);
    return { success: true, sent: users.length, total: userIds.length, result };
  } catch (error) {
    console.error('❌ Send bulk push notifications error:', error);
    return { success: false, error: error.message };
  }
}

module.exports = {
  sendPushNotification,
  sendBulkPushNotifications,
};






