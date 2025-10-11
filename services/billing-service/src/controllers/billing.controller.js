const { prisma } = require('../lib/prisma.js');

class BillingController {
  // Membership Plans Management
  async getAllPlans(req, res) {
    try {
      const plans = await prisma.membershipPlan.findMany({
        include: {
          plan_addons: {
            where: { is_active: true },
          },
        },
        orderBy: { created_at: 'desc' },
      });

      res.json({
        success: true,
        message: 'Membership plans retrieved successfully',
        data: plans,
      });
    } catch (error) {
      console.error('Get plans error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to retrieve membership plans',
        data: null,
      });
    }
  }

  async createPlan(req, res) {
    try {
      const {
        name,
        description,
        type,
        duration_months,
        price,
        setup_fee,
        benefits,
        class_credits,
        guest_passes,
        access_hours,
        access_areas,
      } = req.body;

      const plan = await prisma.membershipPlan.create({
        data: {
          name,
          description,
          type,
          duration_months,
          price,
          setup_fee,
          benefits: benefits || [],
          class_credits,
          guest_passes: guest_passes || 0,
          access_hours,
          access_areas: access_areas || [],
          is_active: true,
        },
      });

      res.status(201).json({
        success: true,
        message: 'Membership plan created successfully',
        data: plan,
      });
    } catch (error) {
      console.error('Create plan error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to create membership plan',
        data: null,
      });
    }
  }

  async updatePlan(req, res) {
    try {
      const { id } = req.params;
      const updateData = req.body;

      const plan = await prisma.membershipPlan.update({
        where: { id },
        data: updateData,
      });

      res.json({
        success: true,
        message: 'Membership plan updated successfully',
        data: plan,
      });
    } catch (error) {
      console.error('Update plan error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to update membership plan',
        data: null,
      });
    }
  }

  async deletePlan(req, res) {
    try {
      const { id } = req.params;

      await prisma.membershipPlan.update({
        where: { id },
        data: { is_active: false },
      });

      res.json({
        success: true,
        message: 'Membership plan deactivated successfully',
        data: null,
      });
    } catch (error) {
      console.error('Delete plan error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to deactivate membership plan',
        data: null,
      });
    }
  }

  // Subscriptions Management
  async getAllSubscriptions(req, res) {
    try {
      const { status, member_id } = req.query;

      const where = {};
      if (status) where.status = status;
      if (member_id) where.member_id = member_id;

      const subscriptions = await prisma.subscription.findMany({
        where,
        include: {
          plan: true,
          subscription_addons: true,
        },
        orderBy: { created_at: 'desc' },
      });

      res.json({
        success: true,
        message: 'Subscriptions retrieved successfully',
        data: subscriptions,
      });
    } catch (error) {
      console.error('Get subscriptions error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to retrieve subscriptions',
        data: null,
      });
    }
  }

  async createSubscription(req, res) {
    try {
      const { member_id, plan_id, start_date, payment_method_id } = req.body;

      // Get plan details
      const plan = await prisma.membershipPlan.findUnique({
        where: { id: plan_id },
      });

      if (!plan) {
        return res.status(404).json({
          success: false,
          message: 'Membership plan not found',
          data: null,
        });
      }

      // Calculate dates and amounts
      const startDate = new Date(start_date || Date.now());
      const endDate = new Date(startDate);
      endDate.setMonth(endDate.getMonth() + plan.duration_months);

      const subscription = await prisma.subscription.create({
        data: {
          member_id,
          plan_id,
          status: 'ACTIVE',
          start_date: startDate,
          end_date: endDate,
          next_billing_date: endDate,
          current_period_start: startDate,
          current_period_end: endDate,
          base_amount: plan.price,
          total_amount: plan.price,
          classes_remaining: plan.class_credits,
          payment_method_id,
          auto_renew: true,
        },
        include: {
          plan: true,
        },
      });

      res.status(201).json({
        success: true,
        message: 'Subscription created successfully',
        data: subscription,
      });
    } catch (error) {
      console.error('Create subscription error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to create subscription',
        data: null,
      });
    }
  }

  async updateSubscription(req, res) {
    try {
      const { id } = req.params;
      const updateData = req.body;

      const subscription = await prisma.subscription.update({
        where: { id },
        data: updateData,
        include: {
          plan: true,
        },
      });

      res.json({
        success: true,
        message: 'Subscription updated successfully',
        data: subscription,
      });
    } catch (error) {
      console.error('Update subscription error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to update subscription',
        data: null,
      });
    }
  }

  async cancelSubscription(req, res) {
    try {
      const { id } = req.params;
      const { reason } = req.body;

      const subscription = await prisma.subscription.update({
        where: { id },
        data: {
          status: 'CANCELLED',
          cancelled_at: new Date(),
          cancellation_reason: reason,
          auto_renew: false,
        },
      });

      res.json({
        success: true,
        message: 'Subscription cancelled successfully',
        data: subscription,
      });
    } catch (error) {
      console.error('Cancel subscription error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to cancel subscription',
        data: null,
      });
    }
  }

  // Payments Management
  async getAllPayments(req, res) {
    try {
      const { member_id, status, payment_type } = req.query;

      const where = {};
      if (member_id) where.member_id = member_id;
      if (status) where.status = status;
      if (payment_type) where.payment_type = payment_type;

      const payments = await prisma.payment.findMany({
        where,
        include: {
          subscription: {
            include: {
              plan: true,
            },
          },
        },
        orderBy: { created_at: 'desc' },
      });

      res.json({
        success: true,
        message: 'Payments retrieved successfully',
        data: payments,
      });
    } catch (error) {
      console.error('Get payments error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to retrieve payments',
        data: null,
      });
    }
  }

  async createPayment(req, res) {
    try {
      const {
        subscription_id,
        member_id,
        amount,
        payment_method,
        payment_type = 'SUBSCRIPTION',
        description,
      } = req.body;

      const payment = await prisma.payment.create({
        data: {
          subscription_id,
          member_id,
          amount,
          currency: 'VND',
          status: 'PENDING',
          payment_method,
          payment_type,
          description,
          net_amount: amount,
        },
      });

      res.status(201).json({
        success: true,
        message: 'Payment created successfully',
        data: payment,
      });
    } catch (error) {
      console.error('Create payment error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to create payment',
        data: null,
      });
    }
  }

  async processPayment(req, res) {
    try {
      const { id } = req.params;
      const { transaction_id, gateway } = req.body;

      const payment = await prisma.payment.update({
        where: { id },
        data: {
          status: 'COMPLETED',
          processed_at: new Date(),
          transaction_id,
          gateway,
        },
      });

      res.json({
        success: true,
        message: 'Payment processed successfully',
        data: payment,
      });
    } catch (error) {
      console.error('Process payment error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to process payment',
        data: null,
      });
    }
  }

  // Invoices Management
  async getAllInvoices(req, res) {
    try {
      const { member_id, status, type } = req.query;

      const where = {};
      if (member_id) where.member_id = member_id;
      if (status) where.status = status;
      if (type) where.type = type;

      const invoices = await prisma.invoice.findMany({
        where,
        include: {
          subscription: {
            include: {
              plan: true,
            },
          },
          payment: true,
        },
        orderBy: { created_at: 'desc' },
      });

      res.json({
        success: true,
        message: 'Invoices retrieved successfully',
        data: invoices,
      });
    } catch (error) {
      console.error('Get invoices error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to retrieve invoices',
        data: null,
      });
    }
  }

  async createInvoice(req, res) {
    try {
      const {
        subscription_id,
        member_id,
        subtotal,
        tax_rate,
        discount_amount,
        type = 'SUBSCRIPTION',
      } = req.body;

      const tax_amount = tax_rate ? subtotal * tax_rate : 0;
      const total = subtotal + tax_amount - (discount_amount || 0);

      // Generate invoice number
      const invoiceCount = await prisma.invoice.count();
      const invoice_number = `INV-${new Date().getFullYear()}-${String(invoiceCount + 1).padStart(6, '0')}`;

      const invoice = await prisma.invoice.create({
        data: {
          subscription_id,
          member_id,
          invoice_number,
          status: 'DRAFT',
          type,
          subtotal,
          tax_rate,
          tax_amount,
          discount_amount,
          total,
        },
        include: {
          subscription: {
            include: {
              plan: true,
            },
          },
        },
      });

      res.status(201).json({
        success: true,
        message: 'Invoice created successfully',
        data: invoice,
      });
    } catch (error) {
      console.error('Create invoice error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to create invoice',
        data: null,
      });
    }
  }

  // Statistics and Reports
  async getStats(req, res) {
    try {
      const [totalPlans, activeSubscriptions, totalRevenue, pendingPayments] = await Promise.all([
        prisma.membershipPlan.count({ where: { is_active: true } }),
        prisma.subscription.count({ where: { status: 'ACTIVE' } }),
        prisma.payment.aggregate({
          where: { status: 'COMPLETED' },
          _sum: { amount: true },
        }),
        prisma.payment.count({ where: { status: 'PENDING' } }),
      ]);

      res.json({
        success: true,
        message: 'Billing statistics retrieved successfully',
        data: {
          totalPlans,
          activeSubscriptions,
          totalRevenue: totalRevenue._sum.amount || 0,
          pendingPayments,
        },
      });
    } catch (error) {
      console.error('Get stats error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to retrieve billing statistics',
        data: null,
      });
    }
  }
}

module.exports = { BillingController };
