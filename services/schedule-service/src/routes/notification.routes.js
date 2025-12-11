const { Router } = require('express');
const axios = require('axios');

const router = Router();

// Note: Auth is handled at gateway/nginx level or in main.js
// We forward the Authorization header to identity-service which will validate it

// Get identity service URL from environment
const IDENTITY_SERVICE_URL = process.env.IDENTITY_SERVICE_URL || 'http://localhost:3001';

/**
 * Proxy notification endpoints to identity-service
 * These endpoints are kept in schedule-service for backward compatibility
 * and to maintain the same API structure for web-admin frontend
 */

/**
 * GET /notifications/unread/:userId
 * Get unread notifications for a user
 */
router.get('/unread/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const token = req.headers.authorization;

    // Forward request to identity-service
    const response = await axios.get(`${IDENTITY_SERVICE_URL}/notifications`, {
      headers: {
        Authorization: token,
        'Content-Type': 'application/json',
      },
      params: {
        unreadOnly: true,
        limit: 100, // Get all unread notifications
      },
    });

    res.json({
      success: true,
      data: response.data.data?.notifications || [],
      message: 'Unread notifications retrieved successfully',
    });
  } catch (error) {
    console.error('[ERROR] Get unread notifications error:', error.message);
    
    if (error.response) {
      // Forward error from identity-service
      res.status(error.response.status).json({
        success: false,
        message: error.response.data?.message || 'Failed to get unread notifications',
        data: null,
      });
    } else {
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        data: null,
      });
    }
  }
});

/**
 * PUT /notifications/:notificationId/read
 * Mark a notification as read
 */
router.put('/:notificationId/read', async (req, res) => {
  try {
    const { notificationId } = req.params;
    const token = req.headers.authorization;

    // Forward request to identity-service
    const response = await axios.put(
      `${IDENTITY_SERVICE_URL}/notifications/${notificationId}/read`,
      {},
      {
        headers: {
          Authorization: token,
          'Content-Type': 'application/json',
        },
      }
    );

    res.json({
      success: true,
      data: response.data.data || null,
      message: 'Notification marked as read',
    });
  } catch (error) {
    console.error('[ERROR] Mark notification as read error:', error.message);
    
    if (error.response) {
      res.status(error.response.status).json({
        success: false,
        message: error.response.data?.message || 'Failed to mark notification as read',
        data: null,
      });
    } else {
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        data: null,
      });
    }
  }
});

/**
 * PUT /notifications/read-all/:userId
 * Mark all notifications as read for a user
 */
router.put('/read-all/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const token = req.headers.authorization;

    // Forward request to identity-service
    // Note: identity-service uses /read-all without userId (gets from JWT)
    const response = await axios.put(
      `${IDENTITY_SERVICE_URL}/notifications/read-all`,
      {},
      {
        headers: {
          Authorization: token,
          'Content-Type': 'application/json',
        },
      }
    );

    res.json({
      success: true,
      data: response.data.data || null,
      message: 'All notifications marked as read',
    });
  } catch (error) {
    console.error('[ERROR] Mark all notifications as read error:', error.message);
    
    if (error.response) {
      res.status(error.response.status).json({
        success: false,
        message: error.response.data?.message || 'Failed to mark all notifications as read',
        data: null,
      });
    } else {
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        data: null,
      });
    }
  }
});

module.exports = router;

