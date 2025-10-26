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
          payments: {
            orderBy: { created_at: 'desc' },
            take: 1, // Get latest payment
          },
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
      const invoice_number = `INV-${new Date().getFullYear()}-${String(invoiceCount + 1).padStart(
        6,
        '0'
      )}`;

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

  // Discount Codes Management
  async validateCoupon(req, res) {
    try {
      const { code, member_id, plan_id } = req.body;

      if (!code) {
        return res.status(400).json({
          success: false,
          message: 'Mã giảm giá là bắt buộc',
          data: null,
        });
      }

      // Find discount code
      const discountCode = await prisma.discountCode.findUnique({
        where: { code: code.toUpperCase() },
      });

      if (!discountCode) {
        return res.status(404).json({
          success: false,
          message: 'Mã giảm giá không tồn tại',
          data: null,
        });
      }

      // Check if active
      if (!discountCode.is_active) {
        return res.status(400).json({
          success: false,
          message: 'Mã giảm giá đã bị vô hiệu hóa',
          data: null,
        });
      }

      // Check validity dates
      const now = new Date();
      if (now < new Date(discountCode.valid_from)) {
        return res.status(400).json({
          success: false,
          message: 'Mã giảm giá chưa có hiệu lực',
          data: null,
        });
      }

      if (discountCode.valid_until && now > new Date(discountCode.valid_until)) {
        return res.status(400).json({
          success: false,
          message: 'Mã giảm giá đã hết hạn',
          data: null,
        });
      }

      // Check usage limit
      if (discountCode.usage_limit && discountCode.usage_count >= discountCode.usage_limit) {
        return res.status(400).json({
          success: false,
          message: 'Mã giảm giá đã hết lượt sử dụng',
          data: null,
        });
      }

      // Check per-member usage limit
      if (member_id && discountCode.usage_limit_per_member) {
        const memberUsageCount = await prisma.discountUsage.count({
          where: {
            discount_code_id: discountCode.id,
            member_id,
          },
        });

        if (memberUsageCount >= discountCode.usage_limit_per_member) {
          return res.status(400).json({
            success: false,
            message: 'Bạn đã sử dụng hết lượt cho mã giảm giá này',
            data: null,
          });
        }
      }

      // Check applicable plans
      if (plan_id && discountCode.applicable_plans.length > 0) {
        if (!discountCode.applicable_plans.includes(plan_id)) {
          return res.status(400).json({
            success: false,
            message: 'Mã giảm giá không áp dụng cho gói này',
            data: null,
          });
        }
      }

      // Check if first time only
      if (discountCode.first_time_only && member_id) {
        const existingSubscriptions = await prisma.subscription.count({
          where: { member_id },
        });

        if (existingSubscriptions > 0) {
          return res.status(400).json({
            success: false,
            message: 'Mã giảm giá chỉ dành cho khách hàng mới',
            data: null,
          });
        }
      }

      // Calculate bonus days (if it's a referral code)
      let bonusDays = 0;
      if (discountCode.type === 'FREE_TRIAL' || discountCode.type === 'FIRST_MONTH_FREE') {
        bonusDays = 30; // 1 month free
      }

      res.json({
        success: true,
        message: 'Mã giảm giá hợp lệ',
        data: {
          code: discountCode.code,
          type: discountCode.type,
          value: discountCode.value,
          maxDiscount: discountCode.max_discount,
          bonusDays,
        },
      });
    } catch (error) {
      console.error('Validate coupon error:', error);
      res.status(500).json({
        success: false,
        message: 'Lỗi khi xác thực mã giảm giá',
        data: null,
      });
    }
  }

  // Payment Gateway Integration
  async initiatePayment(req, res) {
    try {
      const { member_id, subscription_id, amount, payment_method, return_url, cancel_url } =
        req.body;

      if (!member_id || !amount || !payment_method) {
        return res.status(400).json({
          success: false,
          message: 'Thiếu thông tin bắt buộc',
          data: null,
        });
      }

      // Create pending payment record
      const payment = await prisma.payment.create({
        data: {
          subscription_id,
          member_id,
          amount,
          currency: 'VND',
          status: 'PENDING',
          payment_method,
          payment_type: 'SUBSCRIPTION',
          net_amount: amount,
        },
      });

      // Generate payment URL based on gateway
      let paymentUrl = null;
      let gatewayData = {};

      if (payment_method === 'VNPAY') {
        // VNPAY integration would go here
        // For now, return mock data
        paymentUrl = `${process.env.FRONTEND_URL}/payment/processing?payment_id=${payment.id}&gateway=vnpay`;
        gatewayData = {
          paymentId: payment.id,
          gateway: 'VNPAY',
          amount: payment.amount,
        };
      } else if (payment_method === 'MOMO') {
        // MOMO integration would go here
        paymentUrl = `${process.env.FRONTEND_URL}/payment/processing?payment_id=${payment.id}&gateway=momo`;
        gatewayData = {
          paymentId: payment.id,
          gateway: 'MOMO',
          amount: payment.amount,
        };
      } else if (payment_method === 'BANK_TRANSFER') {
        // Create bank transfer with QR code
        const sepayService = require('../services/sepay.service');

        const orderId = payment.id.substring(0, 8).toUpperCase();
        const transferContent = sepayService.generateTransferContent(orderId);
        const qrCodeInfo = await sepayService.generateQRCode(amount, transferContent, orderId);

        // Create bank transfer record
        const bankTransfer = await prisma.bankTransfer.create({
          data: {
            payment_id: payment.id,
            member_id,
            transfer_content: transferContent,
            amount,
            status: 'PENDING',
            bank_name: qrCodeInfo.transferInfo.bankName,
            bank_code: qrCodeInfo.transferInfo.bankCode,
            account_number: qrCodeInfo.transferInfo.accountNumber,
            account_name: qrCodeInfo.transferInfo.accountName,
            qr_code_url: qrCodeInfo.qrCodeUrl,
            qr_data: qrCodeInfo.qrData,
            expires_at: new Date(Date.now() + 30 * 60 * 1000), // 30 minutes
          },
        });

        paymentUrl = null; // No redirect needed
        gatewayData = {
          paymentId: payment.id,
          bankTransferId: bankTransfer.id,
          gateway: 'BANK_TRANSFER',
          qrCodeUrl: qrCodeInfo.qrCodeUrl,
          qrCodeDataURL: qrCodeInfo.qrCodeDataURL,
          bankInfo: qrCodeInfo.transferInfo,
          expiresAt: bankTransfer.expires_at,
        };
      }

      res.json({
        success: true,
        message: 'Khởi tạo thanh toán thành công',
        data: {
          payment,
          paymentUrl,
          gatewayData,
        },
      });
    } catch (error) {
      console.error('Initiate payment error:', error);
      res.status(500).json({
        success: false,
        message: 'Lỗi khi khởi tạo thanh toán',
        data: null,
      });
    }
  }

  async handlePaymentWebhook(req, res) {
    try {
      const { payment_id, status, transaction_id, gateway } = req.body;

      if (!payment_id || !status) {
        return res.status(400).json({
          success: false,
          message: 'Thiếu thông tin webhook',
        });
      }

      // Find payment
      const payment = await prisma.payment.findUnique({
        where: { id: payment_id },
        include: {
          subscription: {
            include: {
              plan: true,
            },
          },
        },
      });

      if (!payment) {
        return res.status(404).json({
          success: false,
          message: 'Không tìm thấy thanh toán',
        });
      }

      // Update payment status
      const updateData = {
        status: status === 'SUCCESS' ? 'COMPLETED' : 'FAILED',
        transaction_id,
        gateway,
      };

      if (status === 'SUCCESS') {
        updateData.processed_at = new Date();
      } else {
        updateData.failed_at = new Date();
        updateData.failure_reason = req.body.reason || 'Payment failed';
      }

      const updatedPayment = await prisma.payment.update({
        where: { id: payment_id },
        data: updateData,
      });

      // If payment successful, activate subscription and create member
      if (status === 'SUCCESS' && payment.subscription) {
        // Update subscription to ACTIVE
        await prisma.subscription.update({
          where: { id: payment.subscription.id },
          data: { status: 'ACTIVE' },
        });

        // Call Member Service to create member
        // This would be an HTTP call to Member Service
        const axios = require('axios');
        const memberServiceUrl = process.env.MEMBER_SERVICE_URL || 'http://member-service:3002';

        try {
          await axios.post(`${memberServiceUrl}/members/create-with-user`, {
            user_id: payment.member_id, // This is actually user_id from Identity Service
            membership_type: payment.subscription.plan.type,
            membership_start_date: payment.subscription.start_date,
            membership_end_date: payment.subscription.end_date,
          });
        } catch (memberError) {
          console.error('Failed to create member:', memberError);
          // Don't fail the webhook, member can be created later
        }
      }

      res.json({
        success: true,
        message: 'Webhook xử lý thành công',
        data: updatedPayment,
      });
    } catch (error) {
      console.error('Payment webhook error:', error);
      res.status(500).json({
        success: false,
        message: 'Lỗi khi xử lý webhook',
      });
    }
  }

  // Enhanced subscription creation with discount support
  async createSubscriptionWithDiscount(req, res) {
    try {
      console.log('📦 Request body:', req.body);
      const { member_id, plan_id, start_date, discount_code, bonus_days = 0 } = req.body;
      console.log('🔑 Extracted member_id:', member_id, 'plan_id:', plan_id);

      // Check if member already has a subscription
      const existingSubscription = await prisma.subscription.findUnique({
        where: { member_id },
        include: {
          plan: true,
          payments: {
            orderBy: { created_at: 'desc' },
            take: 1,
          },
        },
      });

      // If existing subscription has COMPLETED payment, return it
      if (existingSubscription) {
        const hasCompletedPayment = existingSubscription.payments?.[0]?.status === 'COMPLETED';
        const isActiveOrPastDue = ['ACTIVE', 'PAST_DUE'].includes(existingSubscription.status);

        if (hasCompletedPayment || isActiveOrPastDue) {
          console.log('ℹ️ Member already has valid subscription, returning existing one');
          return res.json({
            success: true,
            message: 'Member đã có subscription đang hoạt động',
            ...existingSubscription,
          });
        }

        // If subscription exists but payment not completed, we'll update it below
        console.log('ℹ️ Member has pending subscription, will update it');
      }

      // Get plan details
      const plan = await prisma.membershipPlan.findUnique({
        where: { id: plan_id },
      });

      if (!plan) {
        return res.status(404).json({
          success: false,
          message: 'Không tìm thấy gói thành viên',
          data: null,
        });
      }

      // Calculate dates and amounts
      const startDate = new Date(start_date || Date.now());
      const endDate = new Date(startDate);
      endDate.setMonth(endDate.getMonth() + plan.duration_months);

      // Add bonus days if any
      if (bonus_days > 0) {
        endDate.setDate(endDate.getDate() + bonus_days);
      }

      let baseAmount = Number(plan.price);
      let discountAmount = 0;
      let totalAmount = baseAmount;

      // Apply discount if provided
      if (discount_code) {
        const discountCodeRecord = await prisma.discountCode.findUnique({
          where: { code: discount_code.toUpperCase() },
        });

        if (discountCodeRecord && discountCodeRecord.is_active) {
          if (discountCodeRecord.type === 'PERCENTAGE') {
            discountAmount = (baseAmount * Number(discountCodeRecord.value)) / 100;
            if (discountCodeRecord.max_discount) {
              discountAmount = Math.min(discountAmount, Number(discountCodeRecord.max_discount));
            }
          } else if (discountCodeRecord.type === 'FIXED_AMOUNT') {
            discountAmount = Number(discountCodeRecord.value);
          }

          totalAmount = baseAmount - discountAmount;

          // Record discount usage
          await prisma.discountUsage.create({
            data: {
              discount_code_id: discountCodeRecord.id,
              member_id,
              amount_discounted: discountAmount,
            },
          });

          // Increment usage count
          await prisma.discountCode.update({
            where: { id: discountCodeRecord.id },
            data: { usage_count: { increment: 1 } },
          });
        }
      }

      // Create or update subscription (upsert for PENDING/CANCELLED/TRIAL)
      const subscription = await prisma.subscription.upsert({
        where: { member_id },
        update: {
          plan_id,
          status: 'PENDING', // Will be activated after payment
          start_date: startDate,
          end_date: endDate,
          next_billing_date: endDate,
          current_period_start: startDate,
          current_period_end: endDate,
          base_amount: baseAmount,
          discount_amount: discountAmount,
          total_amount: totalAmount,
          classes_remaining: plan.class_credits,
          auto_renew: true,
          cancelled_at: null,
          cancellation_reason: null,
          cancelled_by: null,
        },
        create: {
          member_id,
          plan_id,
          status: 'PENDING', // Will be activated after payment
          start_date: startDate,
          end_date: endDate,
          next_billing_date: endDate,
          current_period_start: startDate,
          current_period_end: endDate,
          base_amount: baseAmount,
          discount_amount: discountAmount,
          total_amount: totalAmount,
          classes_remaining: plan.class_credits,
          auto_renew: true,
        },
        include: {
          plan: true,
        },
      });

      res.status(201).json({
        success: true,
        message: 'Đăng ký thành công',
        data: subscription,
      });
    } catch (error) {
      console.error('Create subscription with discount error:', error);

      // Check for unique constraint violation
      if (error.code === 'P2002') {
        return res.status(409).json({
          success: false,
          message: 'Member đã có subscription. Vui lòng hủy subscription cũ trước khi tạo mới.',
          data: null,
          error: 'DUPLICATE_SUBSCRIPTION',
        });
      }

      res.status(500).json({
        success: false,
        message: error.message || 'Lỗi khi tạo đăng ký',
        data: null,
        error: error.code || 'UNKNOWN_ERROR',
      });
    }
  }

  // Get active plans for registration
  async getActivePlans(req, res) {
    try {
      const plans = await prisma.membershipPlan.findMany({
        where: { is_active: true },
        select: {
          id: true,
          name: true,
          description: true,
          type: true,
          duration_months: true,
          price: true,
          setup_fee: true,
          benefits: true,
          class_credits: true,
          guest_passes: true,
          personal_training_sessions: true,
          nutritionist_consultations: true,
          smart_workout_plans: true,
          wearable_integration: true,
          advanced_analytics: true,
          equipment_priority: true,
          is_featured: true,
        },
        orderBy: [{ is_featured: 'desc' }, { price: 'asc' }],
      });

      res.json({
        success: true,
        message: 'Lấy danh sách gói thành công',
        data: plans,
      });
    } catch (error) {
      console.error('Get active plans error:', error);
      res.status(500).json({
        success: false,
        message: 'Lỗi khi lấy danh sách gói',
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
