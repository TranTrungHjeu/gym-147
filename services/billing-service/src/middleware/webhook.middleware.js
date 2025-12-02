const sepayService = require('../services/sepay.service.js');
const redisService = require('../services/redis.service.js');

/**
 * Middleware to verify webhook signature and check idempotency
 */
async function verifyWebhookSignature(req, res, next) {
  try {
    const signature = req.headers['x-sepay-signature'] || req.headers['x-signature'];
    const webhookId = req.body?.id || req.body?.transaction_id || req.body?.referenceCode;

    // Verify signature
    if (!sepayService.verifyWebhookSignature(req.body, signature)) {
      console.error('[ERROR] Webhook signature verification failed', {
        webhookId,
        hasSignature: !!signature,
        timestamp: new Date().toISOString(),
      });
      return res.status(401).json({
        success: false,
        message: 'Invalid webhook signature',
      });
    }

    // Check idempotency
    if (webhookId) {
      const isProcessed = await redisService.isWebhookProcessed(webhookId);
      if (isProcessed) {
        console.log('[WARNING] Webhook already processed (idempotency check):', webhookId);
        return res.status(200).json({
          success: true,
          message: 'Webhook already processed',
          data: { idempotent: true },
        });
      }
    }

    // Attach webhook ID to request for later use
    req.webhookId = webhookId;
    next();
  } catch (error) {
    console.error('[ERROR] Webhook verification error:', error);
    res.status(500).json({
      success: false,
      message: 'Webhook verification failed',
    });
  }
}

module.exports = { verifyWebhookSignature };

