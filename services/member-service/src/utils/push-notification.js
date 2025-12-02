const { Client } = require('pg');

// Connect to Identity Service database to get push tokens
// Note: Prisma doesn't support multiple databases in the same client
// We use raw PostgreSQL connection for identity database queries
let identityClient = null;
let connectionPromise = null;

async function getIdentityClient() {
  if (identityClient && !identityClient._ending) {
    return identityClient;
  }

  if (connectionPromise) {
    return connectionPromise;
  }

  const identityDbUrl = process.env.IDENTITY_DATABASE_URL;
  
  if (!identityDbUrl) {
    console.warn('[WARNING] IDENTITY_DATABASE_URL not set, push notifications may not work');
    return null;
  }

  connectionPromise = (async () => {
    try {
      // Create a PostgreSQL client for identity database
      identityClient = new Client({
        connectionString: identityDbUrl,
      });
      
      // Test connection
      await identityClient.connect();
      console.log('[SUCCESS] Connected to Identity database for push notifications');
      connectionPromise = null;
      return identityClient;
    } catch (error) {
      console.error('[ERROR] Failed to connect to Identity database:', error);
      identityClient = null;
      connectionPromise = null;
      return null;
    }
  })();

  return connectionPromise;
}

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
    const client = await getIdentityClient();
    
    if (!client) {
      console.log(`[WARNING] Identity database client not available, skipping push notification for user ${userId}`);
      return { success: false, error: 'Identity database not configured' };
    }

    // Get user's push token from identity service using raw SQL
    // Note: Prisma maps User model to "users" table (lowercase, plural)
    let user;
    try {
      const dbResult = await client.query(
        'SELECT push_token, push_enabled, push_platform FROM users WHERE id = $1',
        [userId]
      );
      user = dbResult.rows[0];
    } catch (dbError) {
      console.error('[ERROR] Database query error:', dbError);
      // Try to reconnect if connection was lost
      if (dbError.code === '57P01' || dbError.code === 'ECONNREFUSED') {
        identityClient = null;
      }
      return { success: false, error: 'Database query failed' };
    }

    if (!user) {
      console.log(`[ERROR] User not found: ${userId}`);
      return { success: false, error: 'User not found' };
    }

    if (!user.push_token) {
      console.log(`[ERROR] No push token for user: ${userId}`);
      return { success: false, error: 'No push token' };
    }

    if (!user.push_enabled) {
      console.log(`[ERROR] Push notifications disabled for user: ${userId}`);
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
      console.log(`[SUCCESS] Push notification sent to user ${userId}: ${title}`);
      return { success: true, result };
    } else {
      console.log(`[WARNING] Push notification failed for user ${userId}:`, result);
      return { success: false, error: result };
    }
  } catch (error) {
    console.error('[ERROR] Send push notification error:', error);
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
    const client = await getIdentityClient();
    
    if (!client) {
      console.log(`[WARNING] Identity database client not available, skipping bulk push notifications`);
      return { success: false, sent: 0, total: userIds.length, error: 'Identity database not configured' };
    }

    // Get all users' push tokens using raw SQL
    // Note: Prisma maps User model to "users" table (lowercase, plural)
    const placeholders = userIds.map((_, index) => `$${index + 1}`).join(', ');
    const dbResult = await client.query(
      `SELECT id, push_token FROM users WHERE id IN (${placeholders}) AND push_enabled = true AND push_token IS NOT NULL`,
      userIds
    );
    
    const users = dbResult.rows;

    if (users.length === 0) {
      console.log(`[ERROR] No users with push tokens found`);
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

    console.log(`[SUCCESS] Bulk push notifications sent to ${users.length}/${userIds.length} users`);
    return { success: true, sent: users.length, total: userIds.length, result };
  } catch (error) {
    console.error('[ERROR] Send bulk push notifications error:', error);
    return { success: false, error: error.message };
  }
}

module.exports = {
  sendPushNotification,
  sendBulkPushNotifications,
};






