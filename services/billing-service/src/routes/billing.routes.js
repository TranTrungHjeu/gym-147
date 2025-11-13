const { Router } = require('express');
const { BillingController } = require('../controllers/billing.controller.js');
const analyticsController = require('../controllers/analytics.controller.js');

const router = Router();
const billingController = new BillingController();

// Membership Plans Routes
router.get('/plans', (req, res) => billingController.getAllPlans(req, res));
router.get('/plans/active', (req, res) => billingController.getActivePlans(req, res));
router.post('/plans', (req, res) => billingController.createPlan(req, res));
router.put('/plans/:id', (req, res) => billingController.updatePlan(req, res));
router.delete('/plans/:id', (req, res) => billingController.deletePlan(req, res));

// Subscriptions Routes
router.get('/subscriptions', (req, res) => billingController.getAllSubscriptions(req, res));
router.post('/subscriptions', (req, res) => billingController.createSubscription(req, res));
router.post('/subscriptions/with-discount', (req, res) =>
  billingController.createSubscriptionWithDiscount(req, res)
);
router.put('/subscriptions/:id', (req, res) => billingController.updateSubscription(req, res));
router.patch('/subscriptions/:id/cancel', (req, res) =>
  billingController.cancelSubscription(req, res)
);

// Payments Routes
router.get('/payments', (req, res) => billingController.getAllPayments(req, res));
router.get('/payments/:id', (req, res) => billingController.getPaymentById(req, res));
router.post('/payments', (req, res) => billingController.createPayment(req, res));
router.put('/payments/:id', (req, res) => billingController.updatePayment(req, res));
router.post('/payments/initiate', (req, res) => billingController.initiatePayment(req, res));
router.post('/payments/webhook', (req, res) => billingController.handlePaymentWebhook(req, res));
router.patch('/payments/:id/process', (req, res) => billingController.processPayment(req, res));
router.get('/payments/:id/receipt', (req, res) => billingController.downloadReceipt(req, res));

// Invoices Routes
router.get('/invoices', (req, res) => billingController.getAllInvoices(req, res));
router.post('/invoices', (req, res) => billingController.createInvoice(req, res));

// Discount Codes Routes
router.post('/validate-coupon', (req, res) => billingController.validateCoupon(req, res));

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

module.exports = { billingRoutes: router };
