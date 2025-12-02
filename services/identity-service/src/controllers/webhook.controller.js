const prisma = require('../lib/prisma.js').prisma;
const crypto = require('crypto');
const axios = require('axios');

class WebhookController {
  /**
   * Get all webhooks
   */
  async getWebhooks(req, res) {
    try {
      const webhooks = await prisma.webhook.findMany({
        orderBy: {
          created_at: 'desc',
        },
        include: {
          _count: {
            select: {
              events_history: true,
            },
          },
        },
      });

      res.json({
        success: true,
        message: 'Webhooks retrieved successfully',
        data: webhooks,
      });
    } catch (error) {
      console.error('Get webhooks error:', error);
      res.status(500).json({
        success: false,
        message: 'Có lỗi xảy ra khi lấy danh sách webhooks',
        data: null,
      });
    }
  }

  /**
   * Get a single webhook by ID
   */
  async getWebhook(req, res) {
    try {
      const { id } = req.params;

      const webhook = await prisma.webhook.findUnique({
        where: { id },
        include: {
          _count: {
            select: {
              events_history: true,
            },
          },
        },
      });

      if (!webhook) {
        return res.status(404).json({
          success: false,
          message: 'Webhook not found',
          data: null,
        });
      }

      res.json({
        success: true,
        message: 'Webhook retrieved successfully',
        data: webhook,
      });
    } catch (error) {
      console.error('Get webhook error:', error);
      res.status(500).json({
        success: false,
        message: 'Có lỗi xảy ra khi lấy webhook',
        data: null,
      });
    }
  }

  /**
   * Create a new webhook
   */
  async createWebhook(req, res) {
    try {
      const { name, url, events, secret, is_active } = req.body;

      if (!name || !url || !events || !Array.isArray(events) || events.length === 0) {
        return res.status(400).json({
          success: false,
          message: 'Name, URL, and events are required',
          data: null,
        });
      }

      // Validate URL
      try {
        new URL(url);
      } catch {
        return res.status(400).json({
          success: false,
          message: 'Invalid URL format',
          data: null,
        });
      }

      const webhook = await prisma.webhook.create({
        data: {
          name,
          url,
          events,
          secret: secret || null,
          is_active: is_active !== undefined ? is_active : true,
        },
      });

      res.status(201).json({
        success: true,
        message: 'Webhook created successfully',
        data: webhook,
      });
    } catch (error) {
      console.error('Create webhook error:', error);
      res.status(500).json({
        success: false,
        message: 'Có lỗi xảy ra khi tạo webhook',
        data: null,
      });
    }
  }

  /**
   * Update webhook
   */
  async updateWebhook(req, res) {
    try {
      const { id } = req.params;
      const { name, url, events, secret, is_active } = req.body;

      // Validate URL if provided
      if (url) {
        try {
          new URL(url);
        } catch {
          return res.status(400).json({
            success: false,
            message: 'Invalid URL format',
            data: null,
          });
        }
      }

      const updateData = {};
      if (name !== undefined) updateData.name = name;
      if (url !== undefined) updateData.url = url;
      if (events !== undefined) updateData.events = events;
      if (secret !== undefined) updateData.secret = secret || null;
      if (is_active !== undefined) updateData.is_active = is_active;

      const webhook = await prisma.webhook.update({
        where: { id },
        data: updateData,
      });

      res.json({
        success: true,
        message: 'Webhook updated successfully',
        data: webhook,
      });
    } catch (error) {
      if (error.code === 'P2025') {
        return res.status(404).json({
          success: false,
          message: 'Webhook not found',
          data: null,
        });
      }

      console.error('Update webhook error:', error);
      res.status(500).json({
        success: false,
        message: 'Có lỗi xảy ra khi cập nhật webhook',
        data: null,
      });
    }
  }

  /**
   * Delete webhook
   */
  async deleteWebhook(req, res) {
    try {
      const { id } = req.params;

      await prisma.webhook.delete({
        where: { id },
      });

      res.json({
        success: true,
        message: 'Webhook deleted successfully',
        data: null,
      });
    } catch (error) {
      if (error.code === 'P2025') {
        return res.status(404).json({
          success: false,
          message: 'Webhook not found',
          data: null,
        });
      }

      console.error('Delete webhook error:', error);
      res.status(500).json({
        success: false,
        message: 'Có lỗi xảy ra khi xóa webhook',
        data: null,
      });
    }
  }

  /**
   * Get webhook events
   */
  async getWebhookEvents(req, res) {
    try {
      const { id } = req.params;
      const page = parseInt(req.query.page) || 1;
      const limit = parseInt(req.query.limit) || 20;
      const skip = (page - 1) * limit;

      const [events, total] = await Promise.all([
        prisma.webhookEvent.findMany({
          where: { webhook_id: id },
          orderBy: { created_at: 'desc' },
          skip,
          take: limit,
        }),
        prisma.webhookEvent.count({
          where: { webhook_id: id },
        }),
      ]);

      res.json({
        success: true,
        message: 'Webhook events retrieved successfully',
        data: {
          events,
          total,
          page,
          limit,
          totalPages: Math.ceil(total / limit),
        },
      });
    } catch (error) {
      console.error('Get webhook events error:', error);
      res.status(500).json({
        success: false,
        message: 'Có lỗi xảy ra khi lấy lịch sử webhook',
        data: null,
      });
    }
  }

  /**
   * Test webhook
   */
  async testWebhook(req, res) {
    try {
      const { id } = req.params;

      const webhook = await prisma.webhook.findUnique({
        where: { id },
      });

      if (!webhook) {
        return res.status(404).json({
          success: false,
          message: 'Webhook not found',
        });
      }

      if (!webhook.is_active) {
        return res.status(400).json({
          success: false,
          message: 'Webhook is not active',
        });
      }

      // Create test event
      const testPayload = {
        event: 'webhook.test',
        timestamp: new Date().toISOString(),
        data: {
          message: 'This is a test webhook event',
        },
      };

      // Trigger webhook asynchronously
      this.triggerWebhook(webhook, testPayload).catch(error => {
        console.error('Test webhook trigger error:', error);
      });

      res.json({
        success: true,
        message: 'Test webhook triggered',
        data: {
          success: true,
          message: 'Webhook test event has been sent',
        },
      });
    } catch (error) {
      console.error('Test webhook error:', error);
      res.status(500).json({
        success: false,
        message: 'Có lỗi xảy ra khi test webhook',
      });
    }
  }

  /**
   * Trigger webhook (async)
   */
  async triggerWebhook(webhook, payload) {
    const maxAttempts = webhook.retry_count || 3;
    let attempts = 0;
    let success = false;

    while (attempts < maxAttempts && !success) {
      attempts++;

      try {
        // Create signature if secret exists
        const headers = {
          'Content-Type': 'application/json',
          'X-Webhook-Event': payload.event || 'webhook.event',
          'X-Webhook-Timestamp': new Date().toISOString(),
        };

        if (webhook.secret) {
          const signature = crypto
            .createHmac('sha256', webhook.secret)
            .update(JSON.stringify(payload))
            .digest('hex');
          headers['X-Webhook-Signature'] = signature;
        }

        // Send webhook
        const response = await axios.post(webhook.url, payload, {
          headers,
          timeout: 10000, // 10 seconds timeout
        });

        // Record success
        await prisma.webhookEvent.create({
          data: {
            webhook_id: webhook.id,
            event_type: payload.event || 'webhook.event',
            payload: payload,
            status: 'SUCCESS',
            response_code: response.status,
            response_body: JSON.stringify(response.data),
            attempts,
          },
        });

        // Update webhook
        await prisma.webhook.update({
          where: { id: webhook.id },
          data: {
            last_triggered_at: new Date(),
            last_success_at: new Date(),
          },
        });

        success = true;
      } catch (error) {
        const responseCode = error.response?.status || null;
        const responseBody = error.response?.data ? JSON.stringify(error.response.data) : error.message;

        // Record failure
        await prisma.webhookEvent.create({
          data: {
            webhook_id: webhook.id,
            event_type: payload.event || 'webhook.event',
            payload: payload,
            status: attempts >= maxAttempts ? 'FAILED' : 'PENDING',
            response_code: responseCode,
            response_body: responseBody,
            attempts,
          },
        });

        if (attempts >= maxAttempts) {
          // Update webhook with failure
          await prisma.webhook.update({
            where: { id: webhook.id },
            data: {
              last_triggered_at: new Date(),
              last_failure_at: new Date(),
            },
          });
        } else {
          // Wait before retry (exponential backoff)
          await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempts) * 1000));
        }
      }
    }
  }
}

module.exports = new WebhookController();

