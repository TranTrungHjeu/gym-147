const bulkNotificationService = require('../services/bulk-notification.service.js');

class BulkNotificationController {
  /**
   * Send bulk notification to members
   * POST /notifications/bulk/members
   * Body: { title, message, type?, filters?, member_ids? }
   */
  async sendBulkNotificationToMembers(req, res) {
    try {
      const senderId = req.user.userId || req.user.id;
      const senderRole = req.user.role;

      if (!senderId) {
        return res.status(401).json({
          success: false,
          message: 'User ID not found in token',
          data: null,
        });
      }

      const { title, message, type = 'GENERAL', filters, member_ids, data, channels } = req.body;

      // Validate required fields
      if (!title || !message) {
        return res.status(400).json({
          success: false,
          message: 'Title and message are required',
          data: null,
        });
      }

      // Validate that we have either filters or member_ids
      if (!filters && (!member_ids || !Array.isArray(member_ids) || member_ids.length === 0)) {
        return res.status(400).json({
          success: false,
          message: 'Either filters or member_ids array is required',
          data: null,
        });
      }

      // Rate limiting: max 1000 recipients
      const MAX_RECIPIENTS = 1000;

      console.log('[NOTIFY] [BULK_NOTIFICATION] Starting bulk notification to members:', {
        senderId,
        senderRole,
        hasFilters: !!filters,
        hasMemberIds: !!member_ids,
        memberIdsCount: member_ids?.length || 0,
      });

      // Get members based on filters or member_ids
      let members = [];
      try {
        members = await bulkNotificationService.getMembersByFilters({
          member_ids,
          ...(filters || {}),
        });
      } catch (error) {
        console.error('[ERROR] [BULK_NOTIFICATION] Error getting members:', error.message);
        return res.status(500).json({
          success: false,
          message: 'Failed to retrieve members',
          data: null,
          error: process.env.NODE_ENV !== 'production' ? error.message : undefined,
        });
      }

      if (members.length === 0) {
        return res.status(404).json({
          success: false,
          message: 'No members found matching the criteria',
          data: null,
        });
      }

      if (members.length > MAX_RECIPIENTS) {
        return res.status(400).json({
          success: false,
          message: `Too many recipients (${members.length}). Maximum allowed is ${MAX_RECIPIENTS}`,
          data: null,
        });
      }

      console.log(`[DATA] [BULK_NOTIFICATION] Found ${members.length} member(s) to notify`);

      // Extract user_ids from members
      const userIds = members.map(m => m.user_id || m.id).filter(id => id); // Filter out null/undefined

      if (userIds.length === 0) {
        return res.status(400).json({
          success: false,
          message: 'No valid user IDs found in members',
          data: null,
        });
      }

      // Create notifications
      const notificationData = {
        type,
        title,
        message,
        data: data || {},
        channels: channels || ['IN_APP', 'PUSH'], // Default to both in-app and push notifications
      };

      console.log(`[SAVE] [BULK_NOTIFICATION] Creating ${userIds.length} notification(s)...`);
      const createResults = await bulkNotificationService.createNotificationsForUsers(
        userIds,
        notificationData
      );

      console.log(`[DATA] [BULK_NOTIFICATION] Create results (MEMBERS):`, {
        success: createResults.success,
        failed: createResults.failed,
        notificationsCount: createResults.notifications?.length || 0,
        notifications: createResults.notifications?.slice(0, 3), // Log first 3
      });

      // Emit socket events with notification IDs
      console.log(
        `[SOCKET] [BULK_NOTIFICATION] Emitting socket events to ${userIds.length} user(s)...`
      );
      await bulkNotificationService.emitSocketEvents(
        userIds,
        notificationData,
        createResults.notifications || []
      );

      // Save history
      const historyData = {
        sender_id: senderId,
        sender_role: senderRole,
        target_type: 'MEMBER',
        target_ids: member_ids || null,
        filters: filters || null,
        title,
        message,
        notification_type: type,
        sent_count: createResults.success,
        failed_count: createResults.failed,
        total_targets: userIds.length,
      };

      let history = null;
      try {
        history = await bulkNotificationService.saveNotificationHistory(historyData);
        console.log(`[SUCCESS] [BULK_NOTIFICATION] History saved: ${history.id}`);
      } catch (historyError) {
        console.error('[ERROR] [BULK_NOTIFICATION] Error saving history:', historyError.message);
        // Don't fail the request if history save fails
      }

      console.log(`[SUCCESS] [BULK_NOTIFICATION] Bulk notification completed:`, {
        total: userIds.length,
        success: createResults.success,
        failed: createResults.failed,
      });

      res.json({
        success: true,
        message: `Notification sent to ${createResults.success} member(s)`,
        data: {
          total_targets: userIds.length,
          sent_count: createResults.success,
          failed_count: createResults.failed,
          errors: createResults.errors.length > 0 ? createResults.errors : undefined,
          history_id: history?.id,
        },
      });
    } catch (error) {
      console.error(
        '[ERROR] [BULK_NOTIFICATION] Error sending bulk notification to members:',
        error
      );
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        data: null,
        error: process.env.NODE_ENV !== 'production' ? error.message : undefined,
      });
    }
  }

  /**
   * Send bulk notification to trainers
   * POST /notifications/bulk/trainers
   * Body: { title, message, type?, filters?, trainer_ids? }
   */
  async sendBulkNotificationToTrainers(req, res) {
    try {
      const senderId = req.user.userId || req.user.id;
      const senderRole = req.user.role;

      if (!senderId) {
        return res.status(401).json({
          success: false,
          message: 'User ID not found in token',
          data: null,
        });
      }

      // Trainers cannot send notifications to other trainers
      if (senderRole === 'TRAINER') {
        return res.status(403).json({
          success: false,
          message: 'Trainers cannot send notifications to other trainers',
          data: null,
        });
      }

      const { title, message, type = 'GENERAL', filters, trainer_ids, data, channels } = req.body;

      // Validate required fields
      if (!title || !message) {
        return res.status(400).json({
          success: false,
          message: 'Title and message are required',
          data: null,
        });
      }

      // Validate that we have either filters or trainer_ids
      if (!filters && (!trainer_ids || !Array.isArray(trainer_ids) || trainer_ids.length === 0)) {
        return res.status(400).json({
          success: false,
          message: 'Either filters or trainer_ids array is required',
          data: null,
        });
      }

      // Rate limiting: max 1000 recipients
      const MAX_RECIPIENTS = 1000;

      console.log('[NOTIFY] [BULK_NOTIFICATION] Starting bulk notification to trainers:', {
        senderId,
        senderRole,
        hasFilters: !!filters,
        hasTrainerIds: !!trainer_ids,
        trainerIdsCount: trainer_ids?.length || 0,
      });

      // Get trainers based on filters or trainer_ids
      let trainers = [];
      try {
        trainers = await bulkNotificationService.getTrainersByFilters({
          trainer_ids,
          ...(filters || {}),
        });
      } catch (error) {
        console.error('[ERROR] [BULK_NOTIFICATION] Error getting trainers:', error.message);
        return res.status(500).json({
          success: false,
          message: 'Failed to retrieve trainers',
          data: null,
          error: process.env.NODE_ENV !== 'production' ? error.message : undefined,
        });
      }

      if (trainers.length === 0) {
        return res.status(404).json({
          success: false,
          message: 'No trainers found matching the criteria',
          data: null,
        });
      }

      if (trainers.length > MAX_RECIPIENTS) {
        return res.status(400).json({
          success: false,
          message: `Too many recipients (${trainers.length}). Maximum allowed is ${MAX_RECIPIENTS}`,
          data: null,
        });
      }

      console.log(`[DATA] [BULK_NOTIFICATION] Found ${trainers.length} trainer(s) to notify`);
      console.log(
        `[SEARCH] [BULK_NOTIFICATION] Trainer data sample:`,
        trainers.slice(0, 3).map(t => ({
          id: t.id,
          user_id: t.user_id,
          full_name: t.full_name,
          email: t.email,
        }))
      );

      // Extract user_ids from trainers and verify they exist in Identity Service
      const { prisma: identityPrisma } = require('../lib/prisma.js');
      const validUserIds = [];
      const invalidTrainers = [];

      for (const trainer of trainers) {
        const userId = trainer.user_id || trainer.id;
        if (!userId) {
          console.warn(`[WARN] [BULK_NOTIFICATION] Trainer ${trainer.id} has no user_id`);
          invalidTrainers.push({ trainer, reason: 'No user_id' });
          continue;
        }

        // Verify user exists in Identity Service
        try {
          const userExists = await identityPrisma.user.findUnique({
            where: { id: userId },
            select: { id: true },
          });

          if (userExists) {
            validUserIds.push(userId);
          } else {
            console.warn(
              `[WARN] [BULK_NOTIFICATION] User ${userId} not found in Identity Service for trainer ${trainer.id} (${trainer.full_name})`
            );
            invalidTrainers.push({
              trainer,
              reason: `User ${userId} not found in Identity Service`,
            });
          }
        } catch (error) {
          console.error(
            `[ERROR] [BULK_NOTIFICATION] Error checking user ${userId}:`,
            error.message
          );
          invalidTrainers.push({ trainer, reason: `Error checking user: ${error.message}` });
        }
      }

      console.log(`👥 [BULK_NOTIFICATION] User ID validation results:`, {
        totalTrainers: trainers.length,
        validUserIds: validUserIds.length,
        invalidTrainers: invalidTrainers.length,
        validUserIds: validUserIds.slice(0, 10), // Log first 10 IDs
        invalidTrainers: invalidTrainers.map(t => ({
          trainerId: t.trainer.id,
          trainerName: t.trainer.full_name,
          userId: t.trainer.user_id,
          reason: t.reason,
        })),
      });

      if (validUserIds.length === 0) {
        console.error(
          `[ERROR] [BULK_NOTIFICATION] No valid user IDs found in trainers. All trainers have invalid user_ids.`
        );
        return res.status(400).json({
          success: false,
          message: `No valid user IDs found. ${invalidTrainers.length} trainer(s) have invalid or missing user_ids.`,
          data: {
            total_trainers: trainers.length,
            invalid_count: invalidTrainers.length,
            invalid_trainers: invalidTrainers.map(t => ({
              trainer_id: t.trainer.id,
              trainer_name: t.trainer.full_name,
              user_id: t.trainer.user_id,
              reason: t.reason,
            })),
          },
        });
      }

      const userIds = validUserIds;

      // Create notifications
      const notificationData = {
        type,
        title,
        message,
        data: data || {},
        channels: channels || ['IN_APP', 'PUSH'], // Default to both in-app and push notifications
      };

      console.log(`[SAVE] [BULK_NOTIFICATION] Creating ${userIds.length} notification(s)...`);
      const createResults = await bulkNotificationService.createNotificationsForUsers(
        userIds,
        notificationData
      );

      console.log(`[DATA] [BULK_NOTIFICATION] Create results (TRAINERS):`, {
        success: createResults.success,
        failed: createResults.failed,
        notificationsCount: createResults.notifications?.length || 0,
        notifications: createResults.notifications?.slice(0, 3), // Log first 3
      });

      // Emit socket events with notification IDs
      console.log(
        `[SOCKET] [BULK_NOTIFICATION] Emitting socket events to ${userIds.length} user(s)...`
      );
      await bulkNotificationService.emitSocketEvents(
        userIds,
        notificationData,
        createResults.notifications || []
      );

      // Save history
      const historyData = {
        sender_id: senderId,
        sender_role: senderRole,
        target_type: 'TRAINER',
        target_ids: trainer_ids || null,
        filters: filters || null,
        title,
        message,
        notification_type: type,
        sent_count: createResults.success,
        failed_count: createResults.failed,
        total_targets: userIds.length,
      };

      let history = null;
      try {
        history = await bulkNotificationService.saveNotificationHistory(historyData);
        console.log(`[SUCCESS] [BULK_NOTIFICATION] History saved: ${history.id}`);
      } catch (historyError) {
        console.error('[ERROR] [BULK_NOTIFICATION] Error saving history:', historyError.message);
        // Don't fail the request if history save fails
      }

      console.log(`[SUCCESS] [BULK_NOTIFICATION] Bulk notification completed:`, {
        total: userIds.length,
        success: createResults.success,
        failed: createResults.failed,
      });

      res.json({
        success: true,
        message: `Notification sent to ${createResults.success} trainer(s)`,
        data: {
          total_targets: userIds.length,
          sent_count: createResults.success,
          failed_count: createResults.failed,
          errors: createResults.errors.length > 0 ? createResults.errors : undefined,
          history_id: history?.id,
        },
      });
    } catch (error) {
      console.error(
        '[ERROR] [BULK_NOTIFICATION] Error sending bulk notification to trainers:',
        error
      );
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        data: null,
        error: process.env.NODE_ENV !== 'production' ? error.message : undefined,
      });
    }
  }

  /**
   * Get notification history
   * GET /notifications/history
   * Query: { page?, limit?, sender_id?, target_type?, startDate?, endDate? }
   */
  async getNotificationHistory(req, res) {
    try {
      const { page = 1, limit = 20, sender_id, target_type, startDate, endDate } = req.query;

      const filters = {
        page: parseInt(page),
        limit: parseInt(limit),
        sender_id,
        target_type,
        startDate,
        endDate,
      };

      const result = await bulkNotificationService.getNotificationHistory(filters);

      res.json({
        success: true,
        message: 'Notification history retrieved successfully',
        data: result,
      });
    } catch (error) {
      console.error('Get notification history error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        data: null,
        error: process.env.NODE_ENV !== 'production' ? error.message : undefined,
      });
    }
  }
}

module.exports = { BulkNotificationController };
