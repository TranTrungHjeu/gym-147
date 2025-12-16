const { Router } = require('express');
const { BillingController } = require('../controllers/billing.controller.js');
const analyticsController = require('../controllers/analytics.controller.js');

const router = Router();
const billingController = new BillingController();

// Membership Plans Routes
// IMPORTANT: More specific routes must be defined BEFORE less specific ones
// Otherwise Express will match /plans before /plans/active
router.get('/plans/active', (req, res) => billingController.getActivePlans(req, res));
router.get('/plans', (req, res) => billingController.getAllPlans(req, res));
router.get('/membership-plans', (req, res) => billingController.getAllPlans(req, res)); // Alias for mobile app
router.post('/plans', (req, res) => billingController.createPlan(req, res));
router.put('/plans/:id', (req, res) => billingController.updatePlan(req, res));
router.delete('/plans/:id', (req, res) => billingController.deletePlan(req, res));

// Subscriptions Routes
router.get('/subscriptions', (req, res) => billingController.getAllSubscriptions(req, res));
router.get('/subscriptions/member/:memberId', (req, res) =>
  billingController.getMemberSubscription(req, res)
);
router.post('/subscriptions', (req, res) => billingController.createSubscription(req, res));
router.post('/subscriptions/with-discount', (req, res) =>
  billingController.createSubscriptionWithDiscount(req, res)
);
router.put('/subscriptions/:id', (req, res) => billingController.updateSubscription(req, res));
// IMPROVEMENT: Upgrade/downgrade subscription route
router.post('/subscriptions/:id/upgrade-downgrade', (req, res) =>
  billingController.upgradeDowngradeSubscription(req, res)
);
router.patch('/subscriptions/:id/renew', (req, res) =>
  billingController.renewSubscription(req, res)
);
router.patch('/subscriptions/:id/cancel', (req, res) =>
  billingController.cancelSubscription(req, res)
);

// Payments Routes
router.get('/payments', (req, res) => billingController.getAllPayments(req, res));
router.get('/payments/:id', (req, res) => billingController.getPaymentById(req, res));
router.post('/payments', (req, res) => billingController.createPayment(req, res));
router.put('/payments/:id', (req, res) => billingController.updatePayment(req, res));
router.post('/payments/initiate', (req, res) => billingController.initiatePayment(req, res));
// IMPROVEMENT: Payment retry and history routes
router.post('/payments/:id/retry', (req, res) => billingController.retryPayment(req, res));
router.get('/payments/history/:member_id', (req, res) =>
  billingController.getPaymentHistory(req, res)
);
// Alias routes for mobile app compatibility
router.get('/members/:member_id/payments', (req, res) =>
  billingController.getPaymentHistory(req, res)
);
// Webhook routes with signature verification
const { verifyWebhookSignature } = require('../middleware/webhook.middleware.js');
router.post('/payments/webhook', verifyWebhookSignature, (req, res) =>
  billingController.handlePaymentWebhook(req, res)
);
router.patch('/payments/:id/process', (req, res) => billingController.processPayment(req, res));
router.get('/payments/:id/receipt', (req, res) => billingController.downloadReceipt(req, res));
router.post('/refunds', (req, res) => billingController.createRefund(req, res));
// IMPROVEMENT: Get all refunds (must come before /refunds/:id routes)
router.get('/refunds', (req, res) => billingController.getAllRefunds(req, res));
// IMPROVEMENT: Get refund by booking ID (must come before /refunds/:id routes)
router.get('/refunds/booking/:booking_id', (req, res) =>
  billingController.getRefundByBookingId(req, res)
);
// IMPROVEMENT: Get refund by ID
router.get('/refunds/:id', (req, res) => billingController.getRefundById(req, res));
// IMPROVEMENT: Refund status update (admin can update status after processing)
router.patch('/refunds/:id/status', (req, res) => billingController.updateRefundStatus(req, res));
// IMPROVEMENT: Refund approval and processing routes (kept for backward compatibility)
router.patch('/refunds/:id/approve', (req, res) => billingController.approveRefund(req, res));
router.patch('/refunds/:id/process', (req, res) => billingController.processRefund(req, res));
// IMPROVEMENT: Refund timeline route
router.get('/refunds/:id/timeline', (req, res) => billingController.getRefundTimeline(req, res));

// Invoices Routes
router.get('/invoices', (req, res) => billingController.getAllInvoices(req, res));
router.post('/invoices', (req, res) => billingController.createInvoice(req, res));
// Alias route for mobile app compatibility
router.get('/members/:member_id/invoices', (req, res) =>
  billingController.getMemberInvoices(req, res)
);

// Discount Codes Routes
// IMPORTANT: More specific routes must be defined BEFORE less specific ones
router.post('/validate-coupon', (req, res) => billingController.validateCoupon(req, res));
router.get('/discount-codes', (req, res) => billingController.getAllDiscountCodes(req, res));
router.post('/discount-codes', (req, res) => billingController.createDiscountCode(req, res));
// Specific routes with additional path must come before /:id routes
router.get('/discount-codes/:id/usage-history', (req, res) =>
  billingController.getDiscountCodeUsageHistory(req, res)
);
router.get('/discount-codes/:id', (req, res) => billingController.getDiscountCodeById(req, res));
router.put('/discount-codes/:id', (req, res) => billingController.updateDiscountCode(req, res));
router.delete('/discount-codes/:id', (req, res) => billingController.deleteDiscountCode(req, res));

// Statistics Routes
router.get('/stats', (req, res) => billingController.getStats(req, res));

// Analytics Routes
router.get('/analytics/dashboard', (req, res) =>
  analyticsController.getDashboardAnalytics(req, res)
);
router.get('/analytics/revenue-reports', (req, res) =>
  analyticsController.getRevenueReports(req, res)
);
router.get('/analytics/revenue-trends', (req, res) =>
  analyticsController.getRevenueTrends(req, res)
);
router.get('/analytics/revenue-by-plan', (req, res) =>
  analyticsController.getRevenueByPlan(req, res)
);
router.post('/analytics/revenue-reports/generate', (req, res) =>
  analyticsController.generateRevenueReport(req, res)
);
router.get('/analytics/revenue-forecast', (req, res) =>
  analyticsController.getRevenueForecast(req, res)
);

// Member Analytics Routes
router.get('/analytics/members/:memberId/ltv', (req, res) =>
  analyticsController.getMemberLTV(req, res)
);
router.put('/analytics/members/:memberId/ltv', (req, res) =>
  analyticsController.updateMemberLTV(req, res)
);
router.get('/analytics/members/at-risk', (req, res) =>
  analyticsController.getAtRiskMembers(req, res)
);
router.get('/analytics/members/top-ltv', (req, res) =>
  analyticsController.getTopMembersByLTV(req, res)
);

// Export Routes
router.get('/analytics/revenue-reports/export/pdf', (req, res) =>
  analyticsController.exportRevenueReportPDF(req, res)
);
router.get('/analytics/revenue-reports/export/excel', (req, res) =>
  analyticsController.exportRevenueReportExcel(req, res)
);
router.get('/analytics/members/export/excel', (req, res) =>
  analyticsController.exportMemberAnalyticsExcel(req, res)
);

// Jobs Routes (for manual triggers)
router.post('/jobs/subscriptions/expire', (req, res) =>
  billingController.runSubscriptionExpirationJob(req, res)
);

module.exports = { billingRoutes: router };
