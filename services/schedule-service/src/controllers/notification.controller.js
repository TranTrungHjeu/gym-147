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

// Get unread count for a user
const getUnreadCount = async (req, res) => {
  try {
    const { user_id } = req.params;

    if (!user_id) {
      return res.status(400).json({
        success: false,
        message: 'User ID is required',
        data: null,
      });
    }

    const count = await prisma.notification.count({
      where: {
        user_id,
        is_read: false,
      },
    });

    res.json({
      success: true,
      message: 'Unread count retrieved successfully',
      data: { unreadCount: count },
    });
  } catch (error) {
    console.error('Get unread count error:', error);
    res.status(500).json({
      success: false,
      message: 'Error retrieving unread count',
      data: null,
    });
  }
};

// Notify admins about subscription payment success (called by billing service)
const notifySubscriptionPaymentSuccess = async (req, res) => {
  try {
    const { member_id, user_id, payment_id, amount, plan_type, plan_name, member_name, member_email } = req.body;

    if (!payment_id || !amount) {
      return res.status(400).json({
        success: false,
        message: 'payment_id and amount are required',
        data: null,
      });
    }

    console.log('📢 Notifying admins about subscription payment success...', {
      payment_id,
      amount,
      member_id,
      user_id,
      plan_type,
    });

    const notificationService = require('../services/notification.service.js');
    const admins = await notificationService.getAdminsAndSuperAdmins();

    if (admins.length === 0) {
      console.log('⚠️ No admins found to notify');
      return res.json({
        success: true,
        message: 'No admins to notify',
        data: { notified_count: 0 },
      });
    }

    console.log(`📋 Found ${admins.length} admin/super-admin users to notify`);

    // Get member info if not provided
    let memberName = member_name || 'Thành viên';
    let memberEmail = member_email || null;
    
    if (member_id && !member_name) {
      try {
        const memberService = require('../services/member.service.js');
        const member = await memberService.getMemberById(member_id);
        if (member) {
          memberName = member.full_name || memberName;
          memberEmail = member.email || memberEmail;
        }
      } catch (memberError) {
        console.error('Failed to fetch member info:', memberError);
        // Continue with default name
      }
    }

    // Format amount as VND
    const formattedAmount = new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency: 'VND',
    }).format(parseFloat(amount));

    // Create notifications for all admins
    const adminNotifications = admins.map(admin => ({
      user_id: admin.user_id,
      type: 'MEMBERSHIP_PAYMENT',
      title: 'Thanh toán gói thành viên thành công',
      message: `${memberName} đã thanh toán ${formattedAmount} cho gói ${plan_name || plan_type || 'thành viên'}`,
      data: {
        payment_id,
        member_id,
        user_id,
        member_name: memberName,
        member_email: memberEmail,
        amount: parseFloat(amount),
        plan_type,
        plan_name,
        payment_status: 'SUCCESS',
        role: 'MEMBER', // Role indicates who performed the action
      },
      is_read: false,
      created_at: new Date(),
    }));

    // Save notifications to database and emit socket events
    if (adminNotifications.length > 0) {
      console.log(`💾 Saving ${adminNotifications.length} notifications to database...`);
      
      // Create notifications one by one to get IDs
      const createdNotifications = [];
      for (const notificationData of adminNotifications) {
        try {
          const createdNotification = await prisma.notification.create({
            data: notificationData,
          });
          createdNotifications.push(createdNotification);
        } catch (error) {
          console.error(`Failed to create notification for user ${notificationData.user_id}:`, error);
        }
      }
      
      console.log(`✅ Saved ${createdNotifications.length} notifications to database`);

      // Emit socket events to all admins
      if (global.io) {
        console.log(`📡 Emitting socket events to ${createdNotifications.length} admin(s)...`);
        createdNotifications.forEach(notification => {
          const roomName = `user:${notification.user_id}`;
          const socketPayload = {
            notification_id: notification.id,
            payment_id,
            member_id,
            user_id,
            member_name: memberName,
            amount: parseFloat(amount),
            formatted_amount: formattedAmount,
            plan_type,
            plan_name,
            payment_status: 'SUCCESS',
            title: notification.title,
            message: notification.message,
            type: notification.type,
            created_at: notification.created_at,
          };

          global.io.to(roomName).emit('subscription:payment:success', socketPayload);
          console.log(`✅ Socket event subscription:payment:success emitted to ${roomName}`);
        });
        console.log(`✅ All socket events emitted successfully to admins`);
      }
    }

    res.json({
      success: true,
      message: `Notifications sent to ${adminNotifications.length} admin(s)`,
      data: {
        notified_count: adminNotifications.length,
        payment_id,
      },
    });
  } catch (error) {
    console.error('❌ Error notifying admins about subscription payment:', error);
    res.status(500).json({
      success: false,
      message: 'Error notifying admins about subscription payment',
      data: null,
      error: error.message,
    });
  }
};

module.exports = {
  getUnreadNotifications,
  markNotificationAsRead,
  markAllNotificationsAsRead,
  getAllNotifications,
  deleteNotification,
  getUnreadCount,
  notifySubscriptionPaymentSuccess,
};
