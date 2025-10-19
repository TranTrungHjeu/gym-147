const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

// Get unread notifications for a user
const getUnreadNotifications = async (req, res) => {
  try {
    const { user_id } = req.params;

    if (!user_id) {
      return res.status(400).json({
        success: false,
        message: 'User ID is required',
        data: null,
      });
    }

    const notifications = await prisma.notification.findMany({
      where: {
        user_id,
        is_read: false,
      },
      orderBy: {
        created_at: 'desc',
      },
      take: 50, // Limit to 50 most recent unread notifications
    });

    res.json({
      success: true,
      message: 'Unread notifications retrieved successfully',
      data: notifications,
    });
  } catch (error) {
    console.error('Get unread notifications error:', error);
    res.status(500).json({
      success: false,
      message: 'Error retrieving unread notifications',
      data: null,
    });
  }
};

// Mark a notification as read
const markNotificationAsRead = async (req, res) => {
  try {
    const { notification_id } = req.params;

    if (!notification_id) {
      return res.status(400).json({
        success: false,
        message: 'Notification ID is required',
        data: null,
      });
    }

    const notification = await prisma.notification.update({
      where: { id: notification_id },
      data: {
        is_read: true,
        read_at: new Date(),
      },
    });

    res.json({
      success: true,
      message: 'Notification marked as read',
      data: notification,
    });
  } catch (error) {
    console.error('Mark notification as read error:', error);
    if (error.code === 'P2025') {
      return res.status(404).json({
        success: false,
        message: 'Notification not found',
        data: null,
      });
    }
    res.status(500).json({
      success: false,
      message: 'Error marking notification as read',
      data: null,
    });
  }
};

// Mark all notifications as read for a user
const markAllNotificationsAsRead = async (req, res) => {
  try {
    const { user_id } = req.params;

    if (!user_id) {
      return res.status(400).json({
        success: false,
        message: 'User ID is required',
        data: null,
      });
    }

    const result = await prisma.notification.updateMany({
      where: {
        user_id,
        is_read: false,
      },
      data: {
        is_read: true,
        read_at: new Date(),
      },
    });

    res.json({
      success: true,
      message: `Marked ${result.count} notifications as read`,
      data: {
        updated_count: result.count,
      },
    });
  } catch (error) {
    console.error('Mark all notifications as read error:', error);
    res.status(500).json({
      success: false,
      message: 'Error marking all notifications as read',
      data: null,
    });
  }
};

// Get all notifications for a user (with pagination)
const getAllNotifications = async (req, res) => {
  try {
    const { user_id } = req.params;
    const { page = 1, limit = 20, type } = req.query;

    if (!user_id) {
      return res.status(400).json({
        success: false,
        message: 'User ID is required',
        data: null,
      });
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const take = parseInt(limit);

    const whereClause = { user_id };
    if (type) {
      whereClause.type = type;
    }

    const [notifications, totalCount] = await Promise.all([
      prisma.notification.findMany({
        where: whereClause,
        orderBy: {
          created_at: 'desc',
        },
        skip,
        take,
      }),
      prisma.notification.count({
        where: whereClause,
      }),
    ]);

    res.json({
      success: true,
      message: 'Notifications retrieved successfully',
      data: {
        notifications,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total: totalCount,
          pages: Math.ceil(totalCount / parseInt(limit)),
        },
      },
    });
  } catch (error) {
    console.error('Get all notifications error:', error);
    res.status(500).json({
      success: false,
      message: 'Error retrieving notifications',
      data: null,
    });
  }
};

// Delete a notification
const deleteNotification = async (req, res) => {
  try {
    const { notification_id } = req.params;

    if (!notification_id) {
      return res.status(400).json({
        success: false,
        message: 'Notification ID is required',
        data: null,
      });
    }

    await prisma.notification.delete({
      where: { id: notification_id },
    });

    res.json({
      success: true,
      message: 'Notification deleted successfully',
      data: null,
    });
  } catch (error) {
    console.error('Delete notification error:', error);
    if (error.code === 'P2025') {
      return res.status(404).json({
        success: false,
        message: 'Notification not found',
        data: null,
      });
    }
    res.status(500).json({
      success: false,
      message: 'Error deleting notification',
      data: null,
    });
  }
};

module.exports = {
  getUnreadNotifications,
  markNotificationAsRead,
  markAllNotificationsAsRead,
  getAllNotifications,
  deleteNotification,
};
