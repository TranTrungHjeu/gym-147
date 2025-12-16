const { prisma } = require('../lib/prisma.js');
const axios = require('axios');
const receiptService = require('../services/receipt.service.js');
const rewardDiscountService = require('../services/reward-discount.service');
const notificationService = require('../services/notification.service.js');
const redisService = require('../services/redis.service.js');

if (!process.env.MEMBER_SERVICE_URL) {
  throw new Error(
    'MEMBER_SERVICE_URL environment variable is required. Please set it in your .env file.'
  );
}
const MEMBER_SERVICE_URL = process.env.MEMBER_SERVICE_URL;

// Configure axios defaults for all requests
axios.defaults.headers.post['Content-Type'] = 'application/json';
axios.defaults.headers.put['Content-Type'] = 'application/json';
axios.defaults.headers.patch['Content-Type'] = 'application/json';

class BillingController {
  /**
   * Helper function to wrap Prisma queries with timeout and retry for connection errors
   * @param {Function} queryFn - Function that returns the Prisma query promise
   * @param {number} timeoutMs - Timeout in milliseconds (default: 10000)
   * @param {string} queryName - Name of the query for logging
   * @param {number} maxRetries - Maximum retries for connection errors (default: 1)
   * @returns {Promise} Query result or throws error
   */
  async withTimeout(queryFn, timeoutMs = 10000, queryName = 'Query', maxRetries = 1) {
    const executeQuery = async (attempt = 0) => {
      try {
        // Create fresh query promise for each attempt
        const queryPromise = queryFn();
        const timeoutPromise = new Promise((_, reject) => {
          setTimeout(() => {
            reject(new Error(`${queryName} timed out after ${timeoutMs}ms`));
          }, timeoutMs);
        });

        return await Promise.race([queryPromise, timeoutPromise]);
      } catch (error) {
        // Retry on connection errors (P1001, P1008, P1014, etc.)
        const isConnectionError =
          error.code === 'P1001' || // Can't reach database server
          error.code === 'P1008' || // Operations timed out
          error.code === 'P1014' || // The database server is not available
          error.code === 'P1017' || // Server has closed the connection
          error.message?.includes("Can't reach database server") ||
          error.message?.includes('connection') ||
          error.message?.includes('ECONNREFUSED') ||
          error.message?.includes('ETIMEDOUT') ||
          error.message?.includes('ENOTFOUND') ||
          error.message?.includes('MaxClientsInSessionMode') ||
          error.message?.includes('max clients reached') ||
          error.message?.includes('pool_size');

        if (isConnectionError && attempt < maxRetries) {
          // Exponential backoff with jitter: 1s, 2s, 4s...
          const baseDelay = 1000 * Math.pow(2, attempt);
          const jitter = Math.random() * 500; // Add random 0-500ms to prevent thundering herd
          const retryDelay = baseDelay + jitter;

          console.log(
            `[RETRY] Retrying ${queryName} after connection error (attempt ${
              attempt + 1
            }/${maxRetries}, delay ${Math.round(retryDelay)}ms)`
          );
          await new Promise(resolve => setTimeout(resolve, retryDelay));
          return executeQuery(attempt + 1);
        }

        throw error;
      }
    };

    return executeQuery();
  }

  /**
   * Helper function to handle database errors consistently
   */
  handleDatabaseError(error, res, context = 'Operation') {
    console.error(`[ERROR] ${context} error:`, error);

    // Handle max clients error (Railway/Supabase Session mode limit)
    if (
      error.message?.includes('MaxClientsInSessionMode') ||
      error.message?.includes('max clients reached') ||
      error.message?.includes('pool_size')
    ) {
      console.error('[ERROR] Database connection pool exhausted:', error.message);
      console.log('[INFO] Returning 503 Service Unavailable response');
      return res.status(503).json({
        success: false,
        message: 'Database connection pool is full. Please try again in a moment.',
        error: 'DATABASE_POOL_EXHAUSTED',
        data: null,
      });
    }

    // Handle database connection errors (P1001: Can't reach database server)
    if (error.code === 'P1001' || error.message?.includes("Can't reach database server")) {
      console.error('[ERROR] Database connection failed:', error.message);
      console.log('[INFO] Returning 503 Service Unavailable response');
      return res.status(503).json({
        success: false,
        message: 'Database service temporarily unavailable. Please try again later.',
        error: 'DATABASE_CONNECTION_ERROR',
        data: null,
      });
    }

    // Handle timeout errors
    // P1008: Operations timed out
    // P1014: The database server is not available
    if (
      error.code === 'P1008' ||
      error.code === 'P1014' ||
      error.message?.includes('timeout') ||
      error.message?.includes('timed out') ||
      error.message?.includes('Operation timed out')
    ) {
      console.error('[ERROR] Database operation timed out:', error.message);
      console.log('[INFO] Returning 504 Gateway Timeout response');
      return res.status(504).json({
        success: false,
        message:
          'Database operation timed out. The request took too long to complete. Please try again.',
        error: 'DATABASE_TIMEOUT_ERROR',
        data: null,
      });
    }

    // Handle other Prisma errors
    if (error.code?.startsWith('P')) {
      console.error('[ERROR] Prisma error:', error.code, error.message);
      return res.status(500).json({
        success: false,
        message: 'Database query failed. Please try again later.',
        error: 'DATABASE_ERROR',
        data: null,
      });
    }

    // Generic error
    return res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: 'INTERNAL_ERROR',
      data: null,
    });
  }

  // Membership Plans Management
  async getAllPlans(req, res) {
    try {
      const { limit = 100, offset = 0, is_active } = req.query;

      // Parse and limit pagination parameters
      const parsedLimit = Math.min(parseInt(limit) || 100, 200); // Max 200 per page
      const parsedOffset = Math.max(parseInt(offset) || 0, 0);

      const where = {};
      if (is_active !== undefined) {
        where.is_active = is_active === 'true' || is_active === true;
      }

      // Use sequential queries to reduce connection pool pressure
      // Count query first (lighter), then fetch data
      const total = await this.withTimeout(
        () => prisma.membershipPlan.count({ where }),
        10000,
        'Count membership plans',
        2
      );

      const plans = await this.withTimeout(
        () =>
          prisma.membershipPlan.findMany({
            where,
            orderBy: { created_at: 'desc' },
            take: parsedLimit,
            skip: parsedOffset,
          }),
        10000,
        'Get membership plans',
        2
      );

      res.json({
        success: true,
        message: 'Membership plans retrieved successfully',
        data: plans,
        pagination: {
          total,
          limit: parsedLimit,
          offset: parsedOffset,
          hasMore: parsedOffset + parsedLimit < total,
        },
      });
    } catch (error) {
      console.error('Get plans error:', error);
      return this.handleDatabaseError(error, res, 'Get all plans');
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
        benefits,
        smart_workout_plans,
        is_featured,
      } = req.body;

      const plan = await prisma.membershipPlan.create({
        data: {
          name,
          description,
          type,
          duration_months,
          price,
          benefits: benefits || [],
          smart_workout_plans: smart_workout_plans || false,
          is_featured: is_featured || false,
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
      const { status, member_id, limit = 50, offset = 0 } = req.query;

      const where = {};
      if (status) where.status = status;
      if (member_id) where.member_id = member_id;

      // Parse limit and offset, ensure they're reasonable
      const parsedLimit = Math.min(parseInt(limit) || 50, 100); // Max 100 per page
      const parsedOffset = Math.max(parseInt(offset) || 0, 0);

      const [subscriptions, total] = await Promise.all([
        prisma.subscription.findMany({
          where,
          include: {
            plan: true,
            payments: {
              orderBy: { created_at: 'desc' },
              // Get all payments to check for COMPLETED payments
              // Frontend needs to check if there's at least one COMPLETED payment
              // for ACTIVE subscriptions, even if latest payment is PENDING
            },
          },
          orderBy: { created_at: 'desc' },
          take: parsedLimit,
          skip: parsedOffset,
        }),
        prisma.subscription.count({ where }),
      ]);

      // Fetch member information for each subscription
      const subscriptionsWithMembers = await Promise.all(
        subscriptions.map(async sub => {
          let member = null;
          if (sub.member_id) {
            try {
              // Try fetching by member ID first
              let memberResponse;
              try {
                memberResponse = await axios.get(`${MEMBER_SERVICE_URL}/members/${sub.member_id}`);
              } catch (idError) {
                // If 404, try fetching by user_id (member_id might be user_id)
                if (idError.response?.status === 404) {
                  try {
                    memberResponse = await axios.get(
                      `${MEMBER_SERVICE_URL}/members/user/${sub.member_id}`
                    );
                  } catch (userIdError) {
                    throw idError; // Throw original error if both fail
                  }
                } else {
                  throw idError;
                }
              }

              if (memberResponse?.data?.success && memberResponse.data.data) {
                // Member service returns { success: true, data: { member: {...} } }
                const memberData = memberResponse.data.data.member || memberResponse.data.data;
                if (memberData) {
                  member = {
                    id: memberData.id || sub.member_id,
                    full_name: memberData.full_name || 'N/A',
                    email: memberData.email || '',
                  };
                  console.log(`[SUCCESS] Fetched member for subscription ${sub.id}:`, {
                    memberId: member.id,
                    fullName: member.full_name,
                    email: member.email,
                  });
                } else {
                  console.warn(
                    `[WARNING] Member data is null for subscription ${sub.id}, member_id: ${sub.member_id}`
                  );
                }
              } else {
                console.warn(`[WARNING] Invalid member response for subscription ${sub.id}:`, {
                  success: memberResponse?.data?.success,
                  hasData: !!memberResponse?.data?.data,
                });
              }
            } catch (error) {
              // Only log if it's not a 404 (expected for missing members)
              if (error.response?.status !== 404) {
                console.warn(
                  `Could not fetch member ${sub.member_id} for subscription:`,
                  error.message
                );
              }
              // Set a fallback member object so UI doesn't break
              member = {
                id: sub.member_id,
                full_name: 'N/A',
                email: '',
              };
            }
          }
          return {
            ...sub,
            member,
          };
        })
      );

      res.json({
        success: true,
        message: 'Subscriptions retrieved successfully',
        data: subscriptionsWithMembers,
        pagination: {
          total,
          limit: parsedLimit,
          offset: parsedOffset,
          hasMore: parsedOffset + parsedLimit < total,
        },
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

  async getMemberSubscription(req, res) {
    try {
      const { memberId } = req.params;

      const subscription = await this.withTimeout(
        () =>
          prisma.subscription.findUnique({
            where: { member_id: memberId },
            include: {
              plan: true,
              payments: {
                orderBy: { created_at: 'desc' },
                take: 1,
              },
            },
          }),
        15000, // 15 seconds timeout
        'Get member subscription',
        1 // 1 retry for connection errors
      );

      if (!subscription) {
        return res.status(404).json({
          success: false,
          message: 'No subscription found for this member',
          data: null,
        });
      }

      res.json({
        success: true,
        message: 'Member subscription retrieved successfully',
        data: subscription,
      });
    } catch (error) {
      return this.handleDatabaseError(error, res, 'Get member subscription');
    }
  }

  async createSubscription(req, res) {
    try {
      const { member_id, plan_id, start_date } = req.body;

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

      // 🔒 Use transaction to prevent duplicate subscriptions
      // Lock and check for existing subscription atomically
      let subscription;
      try {
        subscription = await prisma.$transaction(
          async tx => {
            // 1. Check for existing subscription (with lock)
            const existingSubscription = await tx.subscription.findUnique({
              where: { member_id },
              select: {
                id: true,
                status: true,
                payments: {
                  orderBy: { created_at: 'desc' },
                  take: 1,
                  select: { status: true },
                },
              },
            });

            // If existing subscription has COMPLETED payment or is ACTIVE, throw error
            if (existingSubscription) {
              const hasCompletedPayment =
                existingSubscription.payments?.[0]?.status === 'COMPLETED';
              const isActiveOrPastDue = ['ACTIVE', 'PAST_DUE'].includes(
                existingSubscription.status
              );

              if (hasCompletedPayment || isActiveOrPastDue) {
                throw new Error('SUBSCRIPTION_EXISTS');
              }

              // If subscription exists but payment not completed, update it
              return await tx.subscription.update({
                where: { id: existingSubscription.id },
                data: {
                  plan_id,
                  status: 'ACTIVE',
                  start_date: startDate,
                  end_date: endDate,
                  next_billing_date: endDate,
                  current_period_start: startDate,
                  current_period_end: endDate,
                  base_amount: plan.price,
                  total_amount: plan.price,
                },
                include: {
                  plan: true,
                },
              });
            }

            // 2. Create new subscription
            return await tx.subscription.create({
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
              },
              include: {
                plan: true,
              },
            });
          },
          {
            isolationLevel: 'Serializable', // Prevent phantom reads
          }
        );
      } catch (txError) {
        // Handle transaction errors
        if (txError.message === 'SUBSCRIPTION_EXISTS') {
          return res.status(400).json({
            success: false,
            message: 'Member already has an active subscription',
            data: null,
          });
        }
        // Re-throw to be caught by outer catch
        throw txError;
      }

      // 🔥 Update Member Service: Create Membership record (auto-updates member.membership_type)
      try {
        console.log(
          `📞 Calling Member Service to create membership for user ${member_id} (plan: ${plan.type})...`
        );

        // Create Membership record in Member Service
        // This will automatically update member.membership_type and member.expires_at
        await axios.post(
          `${MEMBER_SERVICE_URL}/members/user/${member_id}/memberships`,
          {
            type: plan.type, // BASIC, PREMIUM, VIP, STUDENT
            start_date: startDate,
            end_date: endDate,
            status: 'ACTIVE',
            price: plan.price,
            benefits: plan.benefits || [], // [SUCCESS] Correct field name
            notes: `Subscribed to ${plan.name} plan`,
          },
          {
            headers: {
              'Content-Type': 'application/json',
            },
          }
        );

        console.log(
          `[SUCCESS] Member Service updated: membership_type = ${plan.type}, membership record created`
        );
      } catch (memberError) {
        console.error('[ERROR] Failed to update Member Service:', memberError.message);
        console.error('Response:', memberError.response?.data);
        // Don't fail the subscription creation - member service update is secondary
      }

      // Create notification for member
      try {
        const notificationService = require('../services/notification.service');
        // Get user_id from member_id (assuming member_id is user_id in this context)
        // If member_id is actually member.id, we need to get user_id from member service
        await notificationService.createSubscriptionNotification({
          userId: member_id, // Assuming member_id is user_id, adjust if needed
          subscriptionId: subscription.id,
          planName: subscription.plan.name,
          planType: subscription.plan.type,
          action: 'created',
        });
      } catch (notificationError) {
        console.error('[ERROR] Failed to create subscription notification:', notificationError);
        // Don't fail subscription creation if notification fails
      }

      res.status(201).json({
        success: true,
        message: 'Subscription created successfully',
        data: subscription,
      });
    } catch (error) {
      console.error('Create subscription error:', error);

      // Handle Prisma unique constraint error
      if (error.code === 'P2002') {
        return res.status(400).json({
          success: false,
          message: 'Member already has a subscription',
          data: null,
        });
      }

      res.status(500).json({
        success: false,
        message: 'Failed to create subscription',
        data: null,
      });
    }
  }

  /**
   * IMPROVEMENT: Upgrade or downgrade subscription
   * POST /subscriptions/:id/upgrade-downgrade
   */
  async upgradeDowngradeSubscription(req, res) {
    try {
      const { id } = req.params;
      const { new_plan_id, change_reason, notes } = req.body;

      if (!new_plan_id) {
        return res.status(400).json({
          success: false,
          message: 'new_plan_id is required',
          data: null,
        });
      }

      // Get current subscription with payments
      const currentSubscription = await prisma.subscription.findUnique({
        where: { id },
        include: {
          plan: true,
          payments: {
            orderBy: { created_at: 'desc' },
            // Get all payments to check for COMPLETED payments
          },
        },
      });

      // Get subscription history separately (no relation defined in schema)
      const subscriptionHistory = await prisma.subscriptionHistory.findMany({
        where: { subscription_id: id },
        orderBy: { created_at: 'desc' },
        take: 1, // Get latest history entry
      });

      if (!currentSubscription) {
        return res.status(404).json({
          success: false,
          message: 'Subscription not found',
          data: null,
        });
      }

      // Check if subscription is active
      if (!['ACTIVE', 'TRIAL'].includes(currentSubscription.status)) {
        return res.status(400).json({
          success: false,
          message: `Cannot upgrade/downgrade subscription with status: ${currentSubscription.status}`,
          data: null,
        });
      }

      // Get new plan
      const newPlan = await prisma.membershipPlan.findUnique({
        where: { id: new_plan_id },
      });

      if (!newPlan) {
        return res.status(404).json({
          success: false,
          message: 'New plan not found',
          data: null,
        });
      }

      // IMPORTANT: Determine actual current plan based on payment status
      // If there's a PENDING payment for upgrade, subscription.plan_id may already be updated
      // but payment not completed yet, so current plan = from_plan_id from subscriptionHistory
      const payments = currentSubscription.payments || [];
      const completedPayments = payments.filter(p => p.status === 'COMPLETED');
      const pendingPayments = payments.filter(
        p => p.status === 'PENDING' || p.status === 'PROCESSING'
      );

      // Check if there's a PENDING payment for upgrade
      const pendingUpgradePayments = pendingPayments.filter(p => {
        const isUpgradePayment =
          p.description?.includes('UPGRADE') ||
          (p.payment_type === 'SUBSCRIPTION' && p.subscription_id === id);
        return isUpgradePayment;
      });

      // Determine actual current plan:
      // - If there's a PENDING upgrade payment AND latest subscriptionHistory is UPGRADE to current plan_id,
      //   use from_plan_id from subscriptionHistory (plan before upgrade that was actually paid)
      // - Otherwise, use subscription.plan_id (plan that's actually paid for)
      let actualCurrentPlanId = String(currentSubscription.plan_id);

      if (pendingUpgradePayments.length > 0 && subscriptionHistory?.length > 0) {
        const latestHistory = subscriptionHistory[0];
        // Only use from_plan_id if:
        // 1. Latest history is an UPGRADE
        // 2. The upgrade is to the current subscription.plan_id (meaning plan_id was updated but not paid)
        // 3. from_plan_id exists
        if (
          latestHistory.change_reason === 'UPGRADE' &&
          String(latestHistory.to_plan_id) === String(currentSubscription.plan_id) &&
          latestHistory.from_plan_id
        ) {
          actualCurrentPlanId = String(latestHistory.from_plan_id);
          console.log('[UPGRADE] Using from_plan_id from history because PENDING payment exists:', {
            subscriptionPlanId: currentSubscription.plan_id,
            actualCurrentPlanId,
            from_plan_id: latestHistory.from_plan_id,
            to_plan_id: latestHistory.to_plan_id,
            change_reason: latestHistory.change_reason,
          });
        }
      }

      // Convert both to strings for comparison
      const newPlanIdStr = String(new_plan_id);

      console.log('[UPGRADE] Plan comparison:', {
        subscriptionPlanId: currentSubscription.plan_id,
        actualCurrentPlanId,
        newPlanIdStr,
        currentPlanType: currentSubscription.plan?.type,
        newPlanType: newPlan.type,
        areEqual: actualCurrentPlanId === newPlanIdStr,
        pendingUpgradePaymentsCount: pendingUpgradePayments.length,
        pendingPaymentsCount: pendingPayments.length,
        completedPaymentsCount: completedPayments.length,
      });

      // Check if plan is actually different
      if (actualCurrentPlanId === newPlanIdStr) {
        if (pendingUpgradePayments.length > 0) {
          // There's a PENDING upgrade payment for the same plan - allow to proceed (will reuse existing payment)
          console.log(
            '[UPGRADE] Actual current plan matches new plan but PENDING upgrade payment exists - allowing to proceed to reuse payment:',
            {
              subscriptionId: id,
              actualCurrentPlanId,
              newPlanIdStr,
              pendingPaymentIds: pendingUpgradePayments.map(p => p.id),
              pendingPaymentAmounts: pendingUpgradePayments.map(p => p.amount),
            }
          );
          // Continue with upgrade - existing payment will be reused
        } else {
          // Plans are same and no PENDING payment - upgrade was already completed
          return res.status(400).json({
            success: false,
            message: 'New plan is the same as current plan',
            data: null,
          });
        }
      }

      // Determine if upgrade or downgrade
      // Use actual current plan (from_plan_id if PENDING payment exists, otherwise subscription.plan_id)
      // Need to get the actual current plan's price
      let actualCurrentPlan;
      if (actualCurrentPlanId !== String(currentSubscription.plan_id)) {
        // Current plan is different from subscription.plan_id (has PENDING payment)
        // Get the actual current plan from database
        actualCurrentPlan = await prisma.membershipPlan.findUnique({
          where: { id: actualCurrentPlanId },
        });
      } else {
        // Current plan matches subscription.plan_id
        actualCurrentPlan = currentSubscription.plan;
      }

      if (!actualCurrentPlan) {
        return res.status(404).json({
          success: false,
          message: 'Current plan not found',
          data: null,
        });
      }

      const oldPrice = parseFloat(actualCurrentPlan.price);
      const newPrice = parseFloat(newPlan.price);
      const isUpgrade = newPrice > oldPrice;
      const changeType = isUpgrade ? 'UPGRADE' : 'DOWNGRADE';

      // Calculate prorated amount
      const now = new Date();
      const periodStart = new Date(currentSubscription.current_period_start);
      const periodEnd = new Date(currentSubscription.current_period_end);
      const totalPeriodDays = (periodEnd - periodStart) / (1000 * 60 * 60 * 24);
      const daysUsed = (now - periodStart) / (1000 * 60 * 60 * 24);
      const daysRemaining = totalPeriodDays - daysUsed;

      // Calculate unused amount from old plan
      const unusedAmount = (daysRemaining / totalPeriodDays) * oldPrice;

      // Calculate cost of new plan for remaining period
      const newPlanCost = (daysRemaining / totalPeriodDays) * newPrice;

      // Calculate price difference
      let priceDifference = newPlanCost - unusedAmount;

      // Round up to nearest 1000 VND to avoid odd amounts (e.g., 19997 -> 20000)
      // This makes it easier for users to transfer and for system to match
      const roundUpToNearest = (amount, nearest = 1000) => {
        return Math.ceil(amount / nearest) * nearest;
      };

      const roundedPriceDifference =
        priceDifference > 0 ? roundUpToNearest(priceDifference, 1000) : priceDifference;

      // Log calculation details for debugging
      console.log('[UPGRADE] Prorated calculation:', {
        subscriptionId: id,
        oldPlan: {
          id: currentSubscription.plan_id,
          name: currentSubscription.plan.name,
          type: currentSubscription.plan.type,
          price: oldPrice,
        },
        newPlan: {
          id: new_plan_id,
          name: newPlan.name,
          type: newPlan.type,
          price: newPrice,
        },
        period: {
          start: periodStart.toISOString(),
          end: periodEnd.toISOString(),
          now: now.toISOString(),
          totalDays: totalPeriodDays.toFixed(2),
          daysUsed: daysUsed.toFixed(2),
          daysRemaining: daysRemaining.toFixed(2),
        },
        calculation: {
          unusedAmount: unusedAmount.toFixed(2),
          newPlanCost: newPlanCost.toFixed(2),
          priceDifference: priceDifference.toFixed(2),
          roundedPriceDifference: roundedPriceDifference.toFixed(2),
          roundingApplied: priceDifference !== roundedPriceDifference,
        },
        isUpgrade,
        changeType,
      });

      // Use rounded amount for payment
      priceDifference = roundedPriceDifference;

      // Use transaction for atomicity
      const result = await prisma.$transaction(async tx => {
        // Update subscription
        const updatedSubscription = await tx.subscription.update({
          where: { id },
          data: {
            plan_id: new_plan_id,
            base_amount: newPrice,
            total_amount: newPrice,
            // Keep same end date (prorated)
          },
          include: {
            plan: true,
          },
        });

        // Create subscription history
        await tx.subscriptionHistory.create({
          data: {
            subscription_id: id,
            member_id: currentSubscription.member_id,
            from_plan_id: currentSubscription.plan_id,
            to_plan_id: new_plan_id,
            from_status: currentSubscription.status,
            to_status: updatedSubscription.status,
            old_price: oldPrice,
            new_price: newPrice,
            price_difference: priceDifference,
            change_reason: changeType,
            changed_by: currentSubscription.member_id,
            notes,
          },
        });

        // If upgrade, create payment for difference
        // Check if there's already a PENDING payment for this upgrade to avoid duplicates
        if (isUpgrade && priceDifference > 0) {
          const upgradeDescription = `${changeType} from ${currentSubscription.plan.name} to ${newPlan.name}`;

          // Check for existing PENDING payment for this upgrade
          // Match by: subscription_id, status PENDING, payment_type SUBSCRIPTION, and similar amount
          // Use tolerance for amount comparison (1000 VND) since we round to nearest 1000
          const existingPayment = await tx.payment.findFirst({
            where: {
              subscription_id: id,
              status: 'PENDING',
              payment_type: 'SUBSCRIPTION',
              amount: {
                gte: priceDifference - 1000, // Allow ±1000 VND tolerance for rounding
                lte: priceDifference + 1000,
              },
              // Match by description containing upgrade info
              description: {
                contains: changeType, // Contains "UPGRADE" or "DOWNGRADE"
              },
            },
            orderBy: { created_at: 'desc' },
          });

          let payment;
          if (existingPayment) {
            // Reuse existing PENDING payment
            console.log('[UPGRADE] Reusing existing PENDING payment to avoid duplicate:', {
              paymentId: existingPayment.id,
              subscriptionId: id,
              amount: existingPayment.amount,
              newAmount: priceDifference,
              description: existingPayment.description,
            });
            payment = existingPayment;
          } else {
            // Create new payment only if no existing PENDING payment found
            payment = await tx.payment.create({
              data: {
                subscription_id: id,
                member_id: currentSubscription.member_id,
                amount: priceDifference,
                currency: 'VND',
                status: 'PENDING',
                payment_method: 'BANK_TRANSFER', // Default, can be changed
                payment_type: 'SUBSCRIPTION',
                description: upgradeDescription,
                net_amount: priceDifference,
              },
            });
            console.log('[UPGRADE] Created new payment for upgrade:', {
              paymentId: payment.id,
              subscriptionId: id,
              amount: priceDifference,
              description: upgradeDescription,
            });
          }

          return { subscription: updatedSubscription, payment, priceDifference };
        }

        // If downgrade, create refund record
        if (!isUpgrade && priceDifference < 0) {
          const refund = await tx.refund.create({
            data: {
              payment_id: currentSubscription.id, // Reference to subscription
              amount: Math.abs(priceDifference),
              reason: 'DOWNGRADE',
              status: 'PENDING',
              requested_by: currentSubscription.member_id,
              notes: `Downgrade refund for ${changeType}`,
            },
          });

          return {
            subscription: updatedSubscription,
            refund,
            refundAmount: Math.abs(priceDifference),
          };
        }

        return { subscription: updatedSubscription };
      });

      // Send notification
      try {
        await notificationService.createSubscriptionNotification({
          userId: currentSubscription.member_id,
          subscriptionId: id,
          planName: newPlan.name,
          planType: newPlan.type,
          action: isUpgrade ? 'upgraded' : 'downgraded',
        });
      } catch (notificationError) {
        console.error('[ERROR] Failed to send upgrade/downgrade notification:', notificationError);
      }

      res.json({
        success: true,
        message: `Subscription ${changeType.toLowerCase()}d successfully`,
        data: {
          subscription: result.subscription,
          change_type: changeType,
          price_difference: priceDifference,
          payment: result.payment || null,
          refund: result.refund || null,
        },
      });
    } catch (error) {
      console.error('Upgrade/downgrade subscription error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to upgrade/downgrade subscription',
        data: null,
      });
    }
  }

  async updateSubscription(req, res) {
    try {
      const { id } = req.params;
      const updateData = req.body;

      // Get old subscription data to detect upgrade
      const oldSubscription = await prisma.subscription.findUnique({
        where: { id },
        include: {
          plan: true,
        },
      });

      if (!oldSubscription) {
        return res.status(404).json({
          success: false,
          message: 'Subscription not found',
          data: null,
        });
      }

      // Update subscription
      const subscription = await prisma.subscription.update({
        where: { id },
        data: updateData,
        include: {
          plan: true,
        },
      });

      // Check if this is an upgrade (plan_id changed)
      const isUpgrade = updateData.plan_id && updateData.plan_id !== oldSubscription.plan_id;

      // Get new plan if upgraded
      let newPlan = null;
      if (isUpgrade) {
        newPlan = await prisma.membershipPlan.findUnique({
          where: { id: updateData.plan_id },
        });
      }

      // Send notification to admins if upgrade
      if (isUpgrade && newPlan) {
        try {
          if (!process.env.SCHEDULE_SERVICE_URL) {
            throw new Error(
              'SCHEDULE_SERVICE_URL environment variable is required. Please set it in your .env file.'
            );
          }
          const scheduleServiceUrl = process.env.SCHEDULE_SERVICE_URL;

          // Get member info
          let memberInfo = null;
          try {
            const memberResponse = await axios.get(
              `${MEMBER_SERVICE_URL}/members/${subscription.member_id}`,
              { timeout: 5000 }
            );
            memberInfo = memberResponse.data?.data?.member || memberResponse.data?.data;
          } catch (memberError) {
            console.log('Could not fetch member info for notification');
          }

          // Calculate price difference
          const priceDifference =
            parseFloat(newPlan.price) - parseFloat(oldSubscription.plan?.price || 0);

          // Call schedule service to notify admins
          await axios.post(
            `${scheduleServiceUrl}/notifications/subscription-renewal-upgrade`,
            {
              subscription_id: subscription.id,
              member_id: subscription.member_id,
              user_id: memberInfo?.user_id || subscription.member_id,
              action_type: 'UPGRADE',
              old_plan_id: oldSubscription.plan_id,
              new_plan_id: newPlan.id,
              old_plan_name: oldSubscription.plan?.name || null,
              new_plan_name: newPlan.name,
              old_plan_type: oldSubscription.plan?.type || null,
              new_plan_type: newPlan.type,
              amount: priceDifference > 0 ? priceDifference : null,
              member_name: memberInfo?.full_name || null,
              member_email: memberInfo?.email || null,
              old_end_date: oldSubscription.end_date || oldSubscription.current_period_end,
              new_end_date: subscription.end_date || subscription.current_period_end,
            },
            {
              headers: {
                'Content-Type': 'application/json',
              },
              timeout: 10000,
            }
          );
          console.log('[SUCCESS] Successfully notified admins about subscription upgrade');
        } catch (notificationError) {
          console.error(
            '[ERROR] Error notifying admins about subscription upgrade:',
            notificationError
          );
          // Don't fail the update if notification fails
        }
      }

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

  async renewSubscription(req, res) {
    try {
      const { id } = req.params;
      const { payment_method } = req.body;

      // Get current subscription with plan
      const subscription = await prisma.subscription.findUnique({
        where: { id },
        include: {
          plan: true,
        },
      });

      if (!subscription) {
        return res.status(404).json({
          success: false,
          message: 'Subscription not found',
          data: null,
        });
      }

      // Calculate new dates (extend by plan duration)
      const currentEndDate = subscription.end_date || subscription.current_period_end;
      const oldEndDate = new Date(currentEndDate);
      const newStartDate = new Date(oldEndDate); // Start from current end date
      const newEndDate = new Date(oldEndDate);
      newEndDate.setMonth(newEndDate.getMonth() + subscription.plan.duration_months);

      // Calculate renewal amount
      const renewalAmount = parseFloat(subscription.total_amount);
      const baseAmount = parseFloat(subscription.base_amount);
      const discountAmount = subscription.discount_amount
        ? parseFloat(subscription.discount_amount)
        : 0;

      // Use transaction to ensure atomicity
      const result = await prisma.$transaction(async tx => {
        // 1. Create payment record
        const payment = await tx.payment.create({
          data: {
            subscription_id: subscription.id,
            member_id: subscription.member_id,
            amount: renewalAmount,
            currency: 'VND',
            status: payment_method ? 'PENDING' : 'COMPLETED', // If no payment method, mark as completed (manual renewal)
            payment_method: payment_method || 'BANK_TRANSFER',
            payment_type: 'SUBSCRIPTION',
            net_amount: renewalAmount,
          },
        });

        // 2. Invoice creation removed - not needed

        // 5. Update subscription with new dates (only if payment is completed or no payment method)
        if (!payment_method || payment.status === 'COMPLETED') {
          await tx.subscription.update({
            where: { id },
            data: {
              end_date: newEndDate,
              current_period_start: newStartDate,
              current_period_end: newEndDate,
              next_billing_date: newEndDate,
              status: 'ACTIVE',
            },
          });
        }

        return { payment };
      });

      // Get updated subscription
      const renewedSubscription = await prisma.subscription.findUnique({
        where: { id },
        include: {
          plan: true,
        },
      });

      // Send notification to admins (only if payment completed)
      if (!payment_method || result.payment.status === 'COMPLETED') {
        try {
          if (!process.env.SCHEDULE_SERVICE_URL) {
            throw new Error(
              'SCHEDULE_SERVICE_URL environment variable is required. Please set it in your .env file.'
            );
          }
          const scheduleServiceUrl = process.env.SCHEDULE_SERVICE_URL;

          // Get member info
          let memberInfo = null;
          try {
            const memberResponse = await axios.get(
              `${MEMBER_SERVICE_URL}/members/${subscription.member_id}`,
              { timeout: 5000 }
            );
            memberInfo = memberResponse.data?.data?.member || memberResponse.data?.data;
          } catch (memberError) {
            console.log('Could not fetch member info for notification');
          }

          // Call schedule service to notify admins
          await axios.post(
            `${scheduleServiceUrl}/notifications/subscription-renewal-upgrade`,
            {
              subscription_id: renewedSubscription.id,
              member_id: renewedSubscription.member_id,
              user_id: memberInfo?.user_id || renewedSubscription.member_id,
              action_type: 'RENEW',
              old_plan_id: subscription.plan_id,
              new_plan_id: subscription.plan_id,
              old_plan_name: subscription.plan?.name || null,
              new_plan_name: subscription.plan?.name || null,
              old_plan_type: subscription.plan?.type || null,
              new_plan_type: subscription.plan?.type || null,
              amount: renewalAmount,
              member_name: memberInfo?.full_name || null,
              member_email: memberInfo?.email || null,
              old_end_date: oldEndDate,
              new_end_date: newEndDate,
            },
            {
              headers: {
                'Content-Type': 'application/json',
              },
              timeout: 10000,
            }
          );
          console.log('[SUCCESS] Successfully notified admins about subscription renewal');
        } catch (notificationError) {
          console.error(
            '[ERROR] Error notifying admins about subscription renewal:',
            notificationError
          );
          // Don't fail the renewal if notification fails
        }

        // Create notification for member
        try {
          const userId = memberInfo?.user_id || renewedSubscription.member_id;
          await notificationService.createSubscriptionNotification({
            userId,
            subscriptionId: renewedSubscription.id,
            planName: subscription.plan.name,
            planType: subscription.plan.type,
            action: 'renewed',
          });
        } catch (notificationError) {
          console.error(
            '[ERROR] Error creating subscription renewal notification:',
            notificationError
          );
        }
      }

      // If payment method provided, return payment info for processing
      if (payment_method && result.payment.status === 'PENDING') {
        res.json({
          success: true,
          message: 'Payment created for subscription renewal',
          data: {
            subscription: renewedSubscription,
            payment: result.payment,
            invoice: result.invoice,
            requires_payment: true,
          },
        });
      } else {
        res.json({
          success: true,
          message: 'Subscription renewed successfully',
          data: {
            subscription: renewedSubscription,
            payment: result.payment,
            invoice: result.invoice,
            requires_payment: false,
          },
        });
      }
    } catch (error) {
      console.error('Renew subscription error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to renew subscription',
        data: null,
        error: error.message,
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

  // TC-PAY-006: Create refund with retry mechanism
  async createRefund(req, res) {
    try {
      const { payment_id, amount, reason, requested_by, notes } = req.body;

      if (!payment_id || !amount || !reason || !requested_by) {
        return res.status(400).json({
          success: false,
          message: 'payment_id, amount, reason, and requested_by are required',
          data: null,
        });
      }

      // Get payment to validate
      const payment = await prisma.payment.findUnique({
        where: { id: payment_id },
        include: {
          refunds: true,
        },
      });

      if (!payment) {
        return res.status(404).json({
          success: false,
          message: 'Payment not found',
          data: null,
        });
      }

      // Accept both COMPLETED and PAID status for refund
      // COMPLETED is used by billing-service, PAID might be used by booking system
      if (payment.status !== 'COMPLETED' && payment.status !== 'PAID') {
        return res.status(400).json({
          success: false,
          message: `Only completed or paid payments can be refunded. Current status: ${payment.status}`,
          data: null,
        });
      }

      // Check if refund amount exceeds payment amount
      const totalRefunded = payment.refunds
        .filter(r => r.status === 'PROCESSED' || r.status === 'APPROVED')
        .reduce((sum, r) => sum + parseFloat(r.amount), 0);

      const refundAmount = parseFloat(amount);
      const remainingAmount = parseFloat(payment.amount) - totalRefunded;

      if (refundAmount > remainingAmount) {
        return res.status(400).json({
          success: false,
          message: `Refund amount exceeds remaining amount. Maximum refund: ${remainingAmount}`,
          data: null,
        });
      }

      // Determine if refund should be auto-processed or require approval
      // System-initiated refunds (from booking cancellation) require approval
      // Admin-initiated refunds can be processed immediately if needed
      const isSystemInitiated = requested_by === 'SYSTEM';
      const shouldAutoProcess = !isSystemInitiated; // Only auto-process if not system-initiated

      // Create refund record with appropriate status
      const result = await prisma.$transaction(async tx => {
        // Calculate total refunded amount BEFORE creating new refund
        // Only count PROCESSED refunds for remaining amount calculation
        const existingRefunds = await tx.refund.findMany({
          where: {
            payment_id,
            status: 'PROCESSED',
          },
        });

        const existingRefundedAmount = existingRefunds.reduce(
          (sum, r) => sum + parseFloat(r.amount),
          0
        );

        // Create refund record
        const refundData = {
          payment_id,
          amount: refundAmount,
          reason,
          status: shouldAutoProcess ? 'PROCESSED' : 'PENDING', // PENDING for system-initiated, PROCESSED for admin
          requested_by,
          approved_by: shouldAutoProcess ? requested_by : null, // Auto-approve only if processing immediately
          notes,
          metadata: {
            timeline: [
              {
                status: shouldAutoProcess ? 'PROCESSED' : 'PENDING',
                timestamp: new Date().toISOString(),
                action: shouldAutoProcess ? 'PROCESSED' : 'REQUESTED',
                actor: requested_by,
                note: shouldAutoProcess
                  ? 'Refund processed immediately'
                  : 'Refund request created, waiting for admin approval',
              },
            ],
          },
        };

        // Only add transaction_id and processed_at if processing immediately
        if (shouldAutoProcess) {
          refundData.transaction_id = `REFUND_${Date.now()}_${payment_id.substring(0, 8)}`;
          refundData.processed_at = new Date();
        }

        const refund = await tx.refund.create({
          data: refundData,
        });

        // Only update payment if processing immediately
        if (shouldAutoProcess) {
          // Calculate new total refunded amount (including the refund we just created)
          const newRefundedAmount = existingRefundedAmount + refundAmount;
          const paymentAmount = parseFloat(payment.amount);

          // Update payment status and refunded_amount
          let newPaymentStatus = payment.status;
          if (newRefundedAmount >= paymentAmount) {
            newPaymentStatus = 'REFUNDED';
          } else if (newRefundedAmount > 0) {
            newPaymentStatus = 'PARTIALLY_REFUNDED';
          }

          await tx.payment.update({
            where: { id: payment_id },
            data: {
              refunded_amount: newRefundedAmount,
              status: newPaymentStatus,
            },
          });
        }

        return refund;
      });

      // Get refund with payment details
      const refundWithPayment = await prisma.refund.findUnique({
        where: { id: result.id },
        include: {
          payment: true,
        },
      });

      // Notify based on status
      if (shouldAutoProcess) {
        // Notify member about successful refund
        try {
          await this.notifyMemberAboutRefund(
            refundWithPayment,
            refundWithPayment.payment,
            'PROCESSED'
          );
        } catch (notifError) {
          console.error('[ERROR] Failed to notify member about refund:', notifError);
          // Don't fail if notification fails
        }
      } else {
        // Notify admins about refund request (for approval)
        try {
          await this.notifyAdminsAboutRefundRequest(refundWithPayment, refundWithPayment.payment);
        } catch (notifError) {
          console.error('[ERROR] Failed to notify admins about refund request:', notifError);
          // Don't fail if notification fails
        }
      }

      res.json({
        success: true,
        message: shouldAutoProcess
          ? 'Refund processed successfully.'
          : 'Refund request created successfully. Waiting for admin approval.',
        data: refundWithPayment,
      });
    } catch (error) {
      console.error('Create refund error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to create refund',
        data: null,
      });
    }
  }

  // Payments Management
  /**
   * IMPROVEMENT: Retry failed payment
   * POST /payments/:id/retry
   */
  async retryPayment(req, res) {
    try {
      const { id } = req.params;
      const { payment_method, return_url, cancel_url } = req.body;

      // Get payment
      const payment = await prisma.payment.findUnique({
        where: { id },
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
          message: 'Payment not found',
          data: null,
        });
      }

      // Only allow retry for FAILED payments
      if (payment.status !== 'FAILED') {
        return res.status(400).json({
          success: false,
          message: `Cannot retry payment with status: ${payment.status}. Only FAILED payments can be retried.`,
          data: null,
        });
      }

      // Check retry count (max 3 retries)
      if (payment.retry_count >= 3) {
        return res.status(400).json({
          success: false,
          message: 'Maximum retry attempts reached. Please contact support.',
          errorCode: 'MAX_RETRIES_EXCEEDED',
          data: null,
        });
      }

      // Increment retry count
      await prisma.payment.update({
        where: { id },
        data: {
          retry_count: { increment: 1 },
          status: 'PENDING',
          failed_at: null,
          failure_reason: null,
        },
      });

      // Re-initiate payment
      const initiateReq = {
        body: {
          member_id: payment.member_id,
          subscription_id: payment.subscription_id,
          amount: payment.amount,
          payment_method: payment_method || payment.payment_method,
          payment_type: payment.payment_type,
          reference_id: payment.reference_id,
          description: payment.description,
          return_url,
          cancel_url,
        },
      };

      // Call initiatePayment internally
      await this.initiatePayment(initiateReq, res);
    } catch (error) {
      console.error('Retry payment error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to retry payment',
        data: null,
      });
    }
  }

  /**
   * IMPROVEMENT: Get payment history for a member
   * GET /payments/history/:member_id
   */
  async getPaymentHistory(req, res) {
    try {
      const { member_id } = req.params;
      const { limit = 50, offset = 0, status, payment_type } = req.query;

      const where = { member_id };
      if (status) where.status = status;
      if (payment_type) where.payment_type = payment_type;

      const parsedLimit = Math.min(parseInt(limit) || 50, 100);
      const parsedOffset = Math.max(parseInt(offset) || 0, 0);

      const [payments, total] = await Promise.all([
        prisma.payment.findMany({
          where,
          include: {
            subscription: {
              include: {
                plan: true,
              },
            },
            refunds: {
              orderBy: { created_at: 'desc' },
            },
          },
          orderBy: { created_at: 'desc' },
          take: parsedLimit,
          skip: parsedOffset,
        }),
        Object.keys(where).length > 0 ? prisma.payment.count({ where }) : prisma.payment.count(),
      ]);

      res.json({
        success: true,
        message: 'Payment history retrieved successfully',
        data: payments,
        pagination: {
          total,
          limit: parsedLimit,
          offset: parsedOffset,
          hasMore: parsedOffset + parsedLimit < total,
        },
      });
    } catch (error) {
      console.error('Get payment history error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to retrieve payment history',
        data: null,
      });
    }
  }

  /**
   * IMPROVEMENT: Get refund timeline
   * GET /refunds/:id/timeline
   */
  async getRefundTimeline(req, res) {
    try {
      const { id } = req.params;

      const refund = await prisma.refund.findUnique({
        where: { id },
        include: {
          payment: {
            include: {
              subscription: {
                include: {
                  plan: true,
                },
              },
            },
          },
        },
      });

      if (!refund) {
        return res.status(404).json({
          success: false,
          message: 'Refund not found',
          data: null,
        });
      }

      // Extract timeline from metadata
      const timeline = refund.metadata?.timeline || [
        {
          status: refund.status,
          timestamp: refund.created_at.toISOString(),
          action: 'REQUESTED',
          actor: refund.requested_by,
        },
      ];

      // Add current status to timeline if not already there
      if (refund.status === 'PROCESSED' && refund.processed_at) {
        timeline.push({
          status: 'PROCESSED',
          timestamp: refund.processed_at.toISOString(),
          action: 'PROCESSED',
          actor: 'SYSTEM',
        });
      } else if (refund.status === 'FAILED' && refund.failed_at) {
        timeline.push({
          status: 'FAILED',
          timestamp: refund.failed_at.toISOString(),
          action: 'FAILED',
          actor: 'SYSTEM',
          reason: refund.failure_reason,
        });
      }

      res.json({
        success: true,
        message: 'Refund timeline retrieved successfully',
        data: {
          refund: {
            id: refund.id,
            amount: refund.amount,
            reason: refund.reason,
            status: refund.status,
            requested_at: refund.created_at,
            processed_at: refund.processed_at,
            failed_at: refund.failed_at,
          },
          timeline: timeline.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp)),
        },
      });
    } catch (error) {
      console.error('Get refund timeline error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to retrieve refund timeline',
        data: null,
      });
    }
  }

  /**
   * Notify admins about refund request
   * @private
   */
  async notifyAdminsAboutRefundRequest(refund, payment) {
    try {
      const IDENTITY_SERVICE_URL = process.env.IDENTITY_SERVICE_URL || 'http://localhost:3001';

      // Get all admin and super admin users from identity service
      let admins = [];
      try {
        const response = await axios.get(`${IDENTITY_SERVICE_URL}/auth/users/admins`, {
          timeout: 10000,
        });

        if (response.data?.success && response.data?.data?.users) {
          admins = response.data.data.users;
          console.log(
            `[SUCCESS] Retrieved ${admins.length} admin/super-admin users for refund notification`
          );
        } else {
          console.warn(
            '[WARNING] Invalid response from Identity Service /auth/users/admins:',
            response.data
          );
        }
      } catch (apiError) {
        console.error(
          '[ERROR] Failed to get admins from Identity Service:',
          apiError.message || apiError
        );
        // Don't throw - continue even if we can't get admin list
        return;
      }

      if (admins.length === 0) {
        console.warn('[WARNING] No active admins found for refund notification');
        return;
      }

      // Get member info for notification message
      let memberName = 'Hội viên';
      try {
        const memberResponse = await axios.get(
          `${MEMBER_SERVICE_URL}/members/${payment.member_id}`,
          {
            timeout: 5000,
          }
        );
        if (memberResponse.data?.success && memberResponse.data?.data?.member) {
          memberName = memberResponse.data.data.member.full_name || memberName;
        }
      } catch (memberError) {
        console.warn(
          '[WARNING] Failed to get member info for refund notification:',
          memberError.message
        );
      }

      // Send notification to each admin
      const notificationPromises = admins.map(admin => {
        return notificationService.createInAppNotification({
          userId: admin.id,
          type: 'REFUND_REQUEST',
          title: 'Yêu cầu hoàn tiền mới',
          message: `${memberName} yêu cầu hoàn tiền ${parseFloat(refund.amount).toLocaleString(
            'vi-VN'
          )} ₫ cho booking đã hủy`,
          data: {
            refund_id: refund.id,
            payment_id: payment.id,
            amount: refund.amount,
            reason: refund.reason,
            member_id: payment.member_id,
            member_name: memberName,
            booking_id: payment.reference_id,
            role: 'ADMIN',
          },
        });
      });

      const results = await Promise.allSettled(notificationPromises);
      const successCount = results.filter(r => r.status === 'fulfilled' && r.value?.success).length;

      console.log(`[SUCCESS] Sent refund notification to ${successCount}/${admins.length} admins`);

      // Also emit socket event to admin room
      if (global.io) {
        global.io.to('admin').emit('refund:request', {
          refund_id: refund.id,
          payment_id: payment.id,
          amount: refund.amount,
          reason: refund.reason,
          member_id: payment.member_id,
          member_name: memberName,
        });
      }
    } catch (error) {
      console.error('[ERROR] Failed to notify admins about refund request:', error);
      // Don't throw - notification failure shouldn't break refund creation
    }
  }

  /**
   * Notify member about refund status change
   * @private
   */
  async notifyMemberAboutRefund(refund, payment, status) {
    try {
      if (!payment.member_id) {
        console.warn('[WARNING] Cannot notify member: payment has no member_id');
        return;
      }

      // Get member info to get user_id
      let memberInfo = null;
      try {
        const memberResponse = await axios.get(
          `${MEMBER_SERVICE_URL}/members/${payment.member_id}`,
          { timeout: 5000 }
        );
        memberInfo = memberResponse.data?.data?.member || memberResponse.data?.data;
      } catch (memberError) {
        console.error('[ERROR] Failed to get member info for refund notification:', memberError);
        return;
      }

      if (!memberInfo?.user_id) {
        console.warn('[WARNING] Cannot notify member: member has no user_id');
        return;
      }

      const statusMessages = {
        APPROVED: {
          title: 'Yêu cầu hoàn tiền đã được duyệt',
          message: `Yêu cầu hoàn tiền của bạn đã được duyệt. Số tiền ${parseFloat(
            refund.amount
          ).toLocaleString('vi-VN')} ₫ sẽ được xử lý trong thời gian sớm nhất.`,
        },
        PROCESSED: {
          title: 'Hoàn tiền thành công',
          message: `Yêu cầu hoàn tiền của bạn đã được xử lý thành công. Số tiền ${parseFloat(
            refund.amount
          ).toLocaleString('vi-VN')} ₫ đã được hoàn về tài khoản của bạn.`,
        },
        FAILED: {
          title: 'Hoàn tiền thất bại',
          message: `Rất tiếc, yêu cầu hoàn tiền của bạn không thể xử lý. Vui lòng liên hệ bộ phận hỗ trợ để được hỗ trợ.`,
        },
      };

      const message = statusMessages[status] || {
        title: 'Cập nhật trạng thái hoàn tiền',
        message: `Trạng thái hoàn tiền của bạn đã được cập nhật: ${status}`,
      };

      await notificationService.sendNotification({
        user_id: memberInfo.user_id,
        type: `REFUND_${status}`,
        title: message.title,
        message: message.message,
        data: {
          refund_id: refund.id,
          payment_id: payment.id,
          amount: refund.amount,
          status: status,
        },
        channels: ['IN_APP', 'PUSH', 'EMAIL'],
      });
    } catch (error) {
      console.error('[ERROR] Failed to notify member about refund:', error);
      // Don't throw - notification failure shouldn't fail the operation
    }
  }

  /**
   * Approve refund request
   * PATCH /refunds/:id/approve
   */
  async approveRefund(req, res) {
    try {
      const { id } = req.params;
      const { approved_by } = req.body; // Admin ID who approves

      if (!approved_by) {
        return res.status(400).json({
          success: false,
          message: 'approved_by is required',
          data: null,
        });
      }

      // Get refund with payment
      const refund = await prisma.refund.findUnique({
        where: { id },
        include: {
          payment: true,
        },
      });

      if (!refund) {
        return res.status(404).json({
          success: false,
          message: 'Refund not found',
          data: null,
        });
      }

      // Validate refund status
      if (refund.status !== 'PENDING') {
        return res.status(400).json({
          success: false,
          message: `Cannot approve refund with status: ${refund.status}. Only PENDING refunds can be approved.`,
          data: null,
        });
      }

      // Update refund status to APPROVED
      const timeline = refund.metadata?.timeline || [];
      timeline.push({
        status: 'APPROVED',
        timestamp: new Date().toISOString(),
        action: 'APPROVED',
        actor: approved_by,
      });

      const updatedRefund = await prisma.refund.update({
        where: { id },
        data: {
          status: 'APPROVED',
          approved_by,
          metadata: {
            ...refund.metadata,
            timeline,
          },
        },
        include: {
          payment: true,
        },
      });

      // Notify member about approval
      try {
        await this.notifyMemberAboutRefund(updatedRefund, refund.payment, 'APPROVED');
      } catch (notifError) {
        console.error('[ERROR] Failed to notify member about refund approval:', notifError);
        // Don't fail if notification fails
      }

      res.json({
        success: true,
        message: 'Refund approved successfully',
        data: updatedRefund,
      });
    } catch (error) {
      console.error('Approve refund error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to approve refund',
        data: null,
      });
    }
  }

  /**
   * Process refund (after approval)
   * PATCH /refunds/:id/process
   */
  async processRefund(req, res) {
    try {
      const { id } = req.params;

      // Get refund with payment
      const refund = await prisma.refund.findUnique({
        where: { id },
        include: {
          payment: {
            include: {
              refunds: true,
            },
          },
        },
      });

      if (!refund) {
        return res.status(404).json({
          success: false,
          message: 'Refund not found',
          data: null,
        });
      }

      // Validate refund status
      if (refund.status !== 'APPROVED') {
        return res.status(400).json({
          success: false,
          message: `Cannot process refund with status: ${refund.status}. Only APPROVED refunds can be processed.`,
          data: null,
        });
      }

      // Process refund using transaction
      const result = await prisma.$transaction(async tx => {
        // Simulate payment gateway refund (or call actual gateway)
        // For now, we'll simulate success
        const transactionId = `REFUND_${refund.id}_${Date.now()}`;

        // Update refund status to PROCESSED
        const timeline = refund.metadata?.timeline || [];
        timeline.push({
          status: 'PROCESSED',
          timestamp: new Date().toISOString(),
          action: 'PROCESSED',
          actor: 'SYSTEM',
          transaction_id: transactionId,
        });

        const updatedRefund = await tx.refund.update({
          where: { id },
          data: {
            status: 'PROCESSED',
            transaction_id: transactionId,
            processed_at: new Date(),
            metadata: {
              ...refund.metadata,
              timeline,
            },
          },
        });

        // Calculate total refunded amount
        const totalRefunded = refund.payment.refunds
          .filter(r => r.id === id || r.status === 'PROCESSED')
          .reduce((sum, r) => {
            if (r.id === id) {
              return sum + parseFloat(refund.amount);
            }
            return sum + parseFloat(r.amount);
          }, 0);

        const paymentAmount = parseFloat(refund.payment.amount);
        const newRefundedAmount = totalRefunded;

        // Update payment status and refunded_amount
        let newPaymentStatus = refund.payment.status;
        if (newRefundedAmount >= paymentAmount) {
          newPaymentStatus = 'REFUNDED';
        } else if (newRefundedAmount > 0) {
          newPaymentStatus = 'PARTIALLY_REFUNDED';
        }

        await tx.payment.update({
          where: { id: refund.payment_id },
          data: {
            refunded_amount: newRefundedAmount,
            status: newPaymentStatus,
          },
        });

        return updatedRefund;
      });

      // Get updated refund with payment
      const refundWithPayment = await prisma.refund.findUnique({
        where: { id },
        include: {
          payment: true,
        },
      });

      // Notify member about processing
      try {
        await this.notifyMemberAboutRefund(
          refundWithPayment,
          refundWithPayment.payment,
          'PROCESSED'
        );
      } catch (notifError) {
        console.error('[ERROR] Failed to notify member about refund processing:', notifError);
        // Don't fail if notification fails
      }

      res.json({
        success: true,
        message: 'Refund processed successfully',
        data: refundWithPayment,
      });
    } catch (error) {
      console.error('Process refund error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to process refund',
        data: null,
      });
    }
  }

  /**
   * Update refund status (for admin to confirm/reject after processing)
   * PATCH /refunds/:id/status
   */
  async updateRefundStatus(req, res) {
    try {
      const { id } = req.params;
      const { status, updated_by, notes } = req.body;

      if (!status) {
        return res.status(400).json({
          success: false,
          message: 'status is required',
          data: null,
        });
      }

      // Validate status
      const validStatuses = ['PENDING', 'APPROVED', 'PROCESSED', 'FAILED', 'REJECTED'];
      if (!validStatuses.includes(status)) {
        return res.status(400).json({
          success: false,
          message: `Invalid status. Valid statuses: ${validStatuses.join(', ')}`,
          data: null,
        });
      }

      // Get refund with payment
      const refund = await prisma.refund.findUnique({
        where: { id },
        include: {
          payment: true,
        },
      });

      if (!refund) {
        return res.status(404).json({
          success: false,
          message: 'Refund not found',
          data: null,
        });
      }

      // Update refund status
      const timeline = refund.metadata?.timeline || [];
      timeline.push({
        status: status,
        timestamp: new Date().toISOString(),
        action: 'STATUS_UPDATED',
        actor: updated_by || 'ADMIN',
        notes: notes || null,
      });

      const updateData = {
        status: status,
        metadata: {
          ...refund.metadata,
          timeline,
        },
      };

      // Update specific fields based on status
      if (status === 'PROCESSED' && !refund.processed_at) {
        updateData.processed_at = new Date();
      } else if (status === 'FAILED' && !refund.failed_at) {
        updateData.failed_at = new Date();
        updateData.failure_reason = notes || 'Refund failed';
      }

      if (notes) {
        updateData.notes = notes;
      }

      const updatedRefund = await prisma.refund.update({
        where: { id },
        data: updateData,
        include: {
          payment: true,
        },
      });

      // Notify member about status change
      try {
        await this.notifyMemberAboutRefund(updatedRefund, refund.payment, status);
      } catch (notifError) {
        console.error('[ERROR] Failed to notify member about refund status update:', notifError);
        // Don't fail if notification fails
      }

      res.json({
        success: true,
        message: 'Refund status updated successfully',
        data: updatedRefund,
      });
    } catch (error) {
      console.error('Update refund status error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to update refund status',
        data: null,
      });
    }
  }

  /**
   * Get all refunds with filters
   * GET /refunds
   */
  async getAllRefunds(req, res) {
    try {
      const {
        status,
        reason,
        requested_by,
        approved_by,
        payment_id,
        member_id,
        all, // Admin flag to view all refunds
        page = 1,
        limit = 50,
        sort_by = 'created_at',
        sort_order = 'desc',
      } = req.query;

      const where = {};
      if (status) where.status = status;
      if (reason) where.reason = reason;
      if (requested_by) where.requested_by = requested_by;
      if (approved_by) where.approved_by = approved_by;

      // Admin can view all refunds with all=true parameter
      const isAdminView = all === 'true' || all === true;

      if (isAdminView) {
        // Admin view: allow viewing all refunds without member_id/payment_id
        console.log('[REFUND] Admin view: Loading all refunds');
      } else {
        // If member_id is provided, get payment_ids for this member first
        let paymentIds = null;
        if (member_id) {
          console.log('[REFUND] Filtering by member_id:', member_id);
          const memberPaymentsWhere = { member_id };

          // If payment_id is also provided, verify it belongs to this member
          if (payment_id) {
            memberPaymentsWhere.id = payment_id;
          }

          const memberPayments = await prisma.payment.findMany({
            where: memberPaymentsWhere,
            select: { id: true },
          });
          paymentIds = memberPayments.map(p => p.id);

          console.log('[REFUND] Found payments for member:', {
            member_id,
            paymentCount: paymentIds.length,
            paymentIds: paymentIds.slice(0, 10), // Log first 10
          });

          // If no payments found for this member, return empty result
          if (paymentIds.length === 0) {
            console.log('[REFUND] No payments found for member, returning empty result');
            return res.json({
              success: true,
              message: 'Refunds retrieved successfully',
              data: [],
              pagination: {
                total: 0,
                page: parseInt(page) || 1,
                limit: Math.min(parseInt(limit) || 50, 100),
                totalPages: 0,
                hasMore: false,
              },
            });
          }

          // Filter refunds by payment_ids (if payment_id was provided, paymentIds will have only one item)
          where.payment_id = paymentIds.length === 1 ? paymentIds[0] : { in: paymentIds };
          console.log('[REFUND] Filtering refunds by payment_ids:', paymentIds.length, 'payments');
        } else if (payment_id) {
          // If only payment_id is provided (no member_id), use it directly
          console.log('[REFUND] Filtering by payment_id only:', payment_id);
          where.payment_id = payment_id;
        } else {
          // If neither member_id nor payment_id is provided, return error
          // This prevents returning all refunds which is a security issue
          console.error(
            '[REFUND] ERROR: Neither member_id nor payment_id provided (and all=true not set)'
          );
          return res.status(400).json({
            success: false,
            message: 'member_id or payment_id is required (or use all=true for admin view)',
            data: null,
          });
        }
      }

      const parsedLimit = Math.min(parseInt(limit) || 50, 100);
      const parsedPage = Math.max(parseInt(page) || 1, 1);
      const skip = (parsedPage - 1) * parsedLimit;

      const orderBy = {};
      orderBy[sort_by] = sort_order.toLowerCase() === 'asc' ? 'asc' : 'desc';

      const [refunds, total] = await Promise.all([
        prisma.refund.findMany({
          where,
          include: {
            payment: {
              include: {
                subscription: {
                  include: {
                    plan: true,
                  },
                },
              },
            },
          },
          orderBy,
          take: parsedLimit,
          skip,
        }),
        prisma.refund.count({ where }),
      ]);

      console.log('[REFUND] Found refunds from database:', {
        count: refunds.length,
        requestedMemberId: member_id,
      });

      // Additional safety check: Filter refunds by member_id if provided
      // This ensures we only return refunds for the requested member
      let filteredRefunds = refunds;
      if (member_id) {
        filteredRefunds = refunds.filter(refund => {
          const refundMemberId = refund.payment?.member_id;
          const matches = refundMemberId === member_id;
          if (!matches) {
            console.warn('[REFUND] WARNING: Refund payment member_id mismatch:', {
              refundId: refund.id,
              refundPaymentMemberId: refundMemberId,
              requestedMemberId: member_id,
            });
          }
          return matches;
        });
        console.log('[REFUND] After member_id filter:', {
          before: refunds.length,
          after: filteredRefunds.length,
        });
      }

      // Fetch member information for each refund's payment
      const refundsWithMembers = await Promise.all(
        filteredRefunds.map(async refund => {
          let member = null;
          if (refund.payment?.member_id) {
            try {
              // Try fetching by member ID first
              let memberResponse;
              try {
                memberResponse = await axios.get(
                  `${MEMBER_SERVICE_URL}/members/${refund.payment.member_id}`
                );
              } catch (idError) {
                // If 404, try fetching by user_id (member_id might be user_id)
                if (idError.response?.status === 404) {
                  try {
                    memberResponse = await axios.get(
                      `${MEMBER_SERVICE_URL}/members/user/${refund.payment.member_id}`
                    );
                  } catch (userIdError) {
                    throw idError; // Throw original error if both fail
                  }
                } else {
                  throw idError;
                }
              }

              if (memberResponse?.data?.success && memberResponse.data.data) {
                // Member service returns { success: true, data: { member: {...} } }
                const memberData = memberResponse.data.data.member || memberResponse.data.data;
                if (memberData) {
                  member = {
                    id: memberData.id || refund.payment.member_id,
                    full_name: memberData.full_name || 'N/A',
                    email: memberData.email || '',
                  };
                }
              }
            } catch (memberError) {
              console.error(
                `[WARNING] Failed to fetch member for refund ${refund.id}:`,
                memberError.message
              );
              // Don't fail the whole request if member fetch fails
              member = {
                id: refund.payment.member_id,
                full_name: 'N/A',
                email: '',
              };
            }
          }

          return {
            ...refund,
            // Ensure amount is a number
            amount: typeof refund.amount === 'string' ? parseFloat(refund.amount) : refund.amount,
            payment: refund.payment
              ? {
                  ...refund.payment,
                  member,
                }
              : null,
          };
        })
      );

      res.json({
        success: true,
        message: 'Refunds retrieved successfully',
        data: refundsWithMembers,
        pagination: {
          total,
          page: parsedPage,
          limit: parsedLimit,
          totalPages: Math.ceil(total / parsedLimit),
          hasMore: skip + parsedLimit < total,
        },
      });
    } catch (error) {
      console.error('Get all refunds error:', error);
      this.handleDatabaseError(error, res, 'Get all refunds');
    }
  }

  /**
   * Get refund by ID
   * GET /refunds/:id
   */
  async getRefundById(req, res) {
    try {
      const { id } = req.params;

      const refund = await prisma.refund.findUnique({
        where: { id },
        include: {
          payment: {
            include: {
              subscription: {
                include: {
                  plan: true,
                },
              },
            },
          },
        },
      });

      if (!refund) {
        return res.status(404).json({
          success: false,
          message: 'Refund not found',
          data: null,
        });
      }

      res.json({
        success: true,
        message: 'Refund retrieved successfully',
        data: refund,
      });
    } catch (error) {
      console.error('Get refund by ID error:', error);
      this.handleDatabaseError(error, res, 'Get refund by ID');
    }
  }

  /**
   * Get refund by booking ID
   * GET /refunds/booking/:booking_id
   */
  async getRefundByBookingId(req, res) {
    try {
      const { booking_id } = req.params;

      // Find payment by reference_id (booking_id)
      const payment = await prisma.payment.findFirst({
        where: {
          reference_id: booking_id,
          payment_type: 'CLASS_BOOKING',
        },
        include: {
          refunds: {
            orderBy: {
              created_at: 'desc',
            },
          },
        },
      });

      if (!payment) {
        return res.json({
          success: true,
          message: 'No payment found for this booking',
          data: null,
        });
      }

      // Get the most recent refund
      const refund = payment.refunds[0] || null;

      if (!refund) {
        return res.json({
          success: true,
          message: 'No refund found for this booking',
          data: null,
        });
      }

      // Get refund with timeline
      const refundWithTimeline = await prisma.refund.findUnique({
        where: { id: refund.id },
        include: {
          payment: true,
        },
      });

      res.json({
        success: true,
        message: 'Refund info retrieved successfully',
        data: refundWithTimeline,
      });
    } catch (error) {
      console.error('Get refund by booking ID error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to retrieve refund info',
        data: null,
      });
    }
  }

  async getAllPayments(req, res) {
    try {
      const { member_id, status, payment_type, reference_id, limit = 50, offset = 0 } = req.query;

      const where = {};
      if (member_id) where.member_id = member_id;
      if (status) where.status = status;
      if (payment_type) where.payment_type = payment_type;
      if (reference_id) where.reference_id = reference_id;

      // Parse limit and offset, ensure they're reasonable
      const parsedLimit = Math.min(parseInt(limit) || 50, 100); // Max 100 per page
      const parsedOffset = Math.max(parseInt(offset) || 0, 0);

      const [payments, total] = await Promise.all([
        prisma.payment.findMany({
          where,
          include: {
            subscription: {
              include: {
                plan: true,
              },
            },
            bank_transfer: true, // Include bank transfer if exists
          },
          orderBy: { created_at: 'desc' },
          take: parsedLimit,
          skip: parsedOffset,
        }),
        Object.keys(where).length > 0 ? prisma.payment.count({ where }) : prisma.payment.count(),
      ]);

      // Fetch member information for each payment
      const paymentsWithMembers = await Promise.all(
        payments.map(async payment => {
          let member = null;
          if (payment.member_id) {
            try {
              // Try fetching by member ID first
              let memberResponse;
              try {
                memberResponse = await axios.get(
                  `${MEMBER_SERVICE_URL}/members/${payment.member_id}`
                );
              } catch (idError) {
                // If 404, try fetching by user_id (member_id might be user_id)
                if (idError.response?.status === 404) {
                  try {
                    memberResponse = await axios.get(
                      `${MEMBER_SERVICE_URL}/members/user/${payment.member_id}`
                    );
                  } catch (userIdError) {
                    throw idError; // Throw original error if both fail
                  }
                } else {
                  throw idError;
                }
              }

              if (memberResponse?.data?.success && memberResponse.data.data) {
                // Member service returns { success: true, data: { member: {...} } }
                const memberData = memberResponse.data.data.member || memberResponse.data.data;
                if (memberData) {
                  member = {
                    id: memberData.id || payment.member_id,
                    full_name: memberData.full_name || 'N/A',
                    email: memberData.email || '',
                  };
                  console.log(`[SUCCESS] Fetched member for payment ${payment.id}:`, {
                    memberId: member.id,
                    fullName: member.full_name,
                    email: member.email,
                  });
                } else {
                  console.warn(
                    `[WARNING] Member data is null for payment ${payment.id}, member_id: ${payment.member_id}`
                  );
                }
              } else {
                console.warn(`[WARNING] Invalid member response for payment ${payment.id}:`, {
                  success: memberResponse?.data?.success,
                  hasData: !!memberResponse?.data?.data,
                });
              }
            } catch (error) {
              // Only log if it's not a 404 (expected for missing members)
              if (error.response?.status !== 404) {
                console.warn(
                  `Could not fetch member ${payment.member_id} for payment:`,
                  error.message
                );
              }
              // Set a fallback member object so UI doesn't break
              member = {
                id: payment.member_id,
                full_name: 'N/A',
                email: '',
              };
            }
          }
          return {
            ...payment,
            member,
            // Map status to match frontend expectations
            status: payment.status === 'COMPLETED' ? 'PAID' : payment.status,
            payment_date: payment.created_at,
            transaction_id: payment.reference_id || payment.transaction_id,
          };
        })
      );

      res.json({
        success: true,
        message: 'Payments retrieved successfully',
        data: paymentsWithMembers,
        pagination: {
          total,
          limit: parsedLimit,
          offset: parsedOffset,
          hasMore: parsedOffset + parsedLimit < total,
        },
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
        status, // Allow status to be set (e.g., 'COMPLETED' for auto-created payments)
        reference_id, // Allow reference_id to be set (e.g., booking.id)
        processed_at, // Allow processed_at to be set (e.g., when auto-creating completed payments)
        net_amount, // Allow net_amount to be set (defaults to amount)
      } = req.body;

      // Validate required fields
      if (!member_id || !amount || !payment_method) {
        return res.status(400).json({
          success: false,
          message: 'member_id, amount, and payment_method are required',
          data: null,
        });
      }

      const payment = await prisma.payment.create({
        data: {
          subscription_id: subscription_id || null,
          member_id,
          amount,
          currency: 'VND',
          status: status || 'PENDING', // Use provided status or default to PENDING
          payment_method,
          payment_type,
          description,
          reference_id: reference_id || null, // Allow reference_id to be set
          net_amount: net_amount !== undefined ? net_amount : amount, // Use provided net_amount or default to amount
          processed_at: processed_at
            ? new Date(processed_at)
            : status === 'COMPLETED'
            ? new Date()
            : null, // Set processed_at if status is COMPLETED
        },
      });

      console.log('[SUCCESS] Payment created:', {
        payment_id: payment.id,
        member_id: payment.member_id,
        amount: payment.amount,
        status: payment.status,
        payment_type: payment.payment_type,
        reference_id: payment.reference_id,
      });

      res.status(201).json({
        success: true,
        message: 'Payment created successfully',
        data: payment,
      });
    } catch (error) {
      console.error('[ERROR] Create payment error:', error);
      console.error('[ERROR] Request body:', req.body);
      res.status(500).json({
        success: false,
        message: 'Failed to create payment',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined,
        data: null,
      });
    }
  }

  async getPaymentById(req, res) {
    try {
      const { id } = req.params;

      const payment = await prisma.payment.findUnique({
        where: { id },
        include: {
          subscription: {
            include: {
              plan: true,
            },
          },
          bank_transfer: true,
          refunds: true,
        },
      });

      if (!payment) {
        return res.status(404).json({
          success: false,
          message: 'Payment not found',
          data: null,
        });
      }

      res.json({
        success: true,
        message: 'Payment retrieved successfully',
        data: payment,
      });
    } catch (error) {
      console.error('Get payment by id error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to retrieve payment',
        data: null,
      });
    }
  }

  async updatePayment(req, res) {
    try {
      const { id } = req.params;
      const { payment_type, reference_id, description, status } = req.body;

      const updateData = {};
      if (payment_type) updateData.payment_type = payment_type;
      if (reference_id !== undefined) updateData.reference_id = reference_id;
      if (description !== undefined) updateData.description = description;
      if (status) updateData.status = status;

      const payment = await prisma.payment.update({
        where: { id },
        data: updateData,
      });

      res.json({
        success: true,
        message: 'Payment updated successfully',
        data: payment,
      });
    } catch (error) {
      console.error('Update payment error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to update payment',
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
      const { member_id, status, type, limit = 50, offset = 0 } = req.query;

      const where = {};
      if (member_id) where.member_id = member_id;
      if (status) where.status = status;
      if (type) where.type = type;

      // Parse and limit pagination parameters
      const parsedLimit = Math.min(parseInt(limit) || 50, 100); // Max 100 per page
      const parsedOffset = Math.max(parseInt(offset) || 0, 0);

      const [invoices, total] = await Promise.all([
        prisma.invoice.findMany({
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
          take: parsedLimit,
          skip: parsedOffset,
        }),
        prisma.invoice.count({ where }),
      ]);

      res.json({
        success: true,
        message: 'Invoices retrieved successfully',
        data: invoices,
        pagination: {
          total,
          limit: parsedLimit,
          offset: parsedOffset,
          hasMore: parsedOffset + parsedLimit < total,
        },
      });
    } catch (error) {
      console.error('Get invoices error:', error);
      return this.handleDatabaseError(error, res, 'Get all invoices');
    }
  }

  /**
   * Get invoices for a specific member
   * GET /members/:member_id/invoices
   * Note: If Invoice model doesn't exist, return empty array
   */
  async getMemberInvoices(req, res) {
    try {
      const { member_id } = req.params;
      const { status, type, limit = 50, offset = 0 } = req.query;

      // Check if Invoice model exists in Prisma
      // If not, return empty array (invoices feature not implemented yet)
      try {
        const where = { member_id };
        if (status) where.status = status;
        if (type) where.type = type;

        // Parse and limit pagination parameters
        const parsedLimit = Math.min(parseInt(limit) || 50, 100); // Max 100 per page
        const parsedOffset = Math.max(parseInt(offset) || 0, 0);

        const [invoices, total] = await Promise.all([
          prisma.invoice.findMany({
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
            take: parsedLimit,
            skip: parsedOffset,
          }),
          prisma.invoice.count({ where }),
        ]);

        res.json({
          success: true,
          message: 'Member invoices retrieved successfully',
          data: invoices,
          pagination: {
            total,
            limit: parsedLimit,
            offset: parsedOffset,
            hasMore: parsedOffset + parsedLimit < total,
          },
        });
      } catch (prismaError) {
        // If Invoice model doesn't exist, return empty array
        if (prismaError.message?.includes('invoice') || prismaError.code === 'P2001') {
          console.log('[INFO] Invoice model not found, returning empty array');
          res.json({
            success: true,
            message: 'Member invoices retrieved successfully',
            data: [],
            pagination: {
              total: 0,
              limit: parseInt(limit) || 50,
              offset: parseInt(offset) || 0,
              hasMore: false,
            },
          });
        } else {
          throw prismaError;
        }
      }
    } catch (error) {
      console.error('Get member invoices error:', error);
      return this.handleDatabaseError(error, res, 'Get member invoices');
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

      // Create invoice notification for member
      try {
        await notificationService.createInvoiceNotification({
          userId: member_id,
          invoiceId: invoice.id,
          invoiceNumber: invoice.invoice_number,
          amount: parseFloat(invoice.total),
          status: invoice.status,
        });
      } catch (notificationError) {
        console.error('[ERROR] Error creating invoice notification:', notificationError);
      }

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

      const codeUpper = code.toUpperCase().trim();

      // Check if this is a reward redemption code (format: REWARD-XXXX-XXXX)
      if (codeUpper.startsWith('REWARD-')) {
        console.log('[GIFT] Validating reward redemption code:', codeUpper);

        if (!member_id) {
          return res.status(400).json({
            success: false,
            message: 'Member ID is required for reward redemption codes',
            data: null,
          });
        }

        const rewardCodeResult = await rewardDiscountService.verifyRewardCode(codeUpper, member_id);

        if (rewardCodeResult.success && rewardCodeResult.discount) {
          const rewardDiscount = rewardCodeResult.discount;
          const redemption = rewardCodeResult.redemption;

          // Return discount details in same format as regular discount codes
          return res.json({
            success: true,
            message: 'Mã đổi thưởng hợp lệ',
            data: {
              code: codeUpper,
              type: rewardDiscount.type === 'PERCENTAGE' ? 'PERCENTAGE' : 'FIXED_AMOUNT',
              value: rewardDiscount.value,
              maxDiscount: rewardDiscount.max_discount || null,
              bonusDays: 0,
              isTrialCode: false,
              isRewardCode: true, // Flag to indicate this is a reward redemption code
              redemption_id: redemption.id,
              reward_id: rewardDiscount.reward_id,
            },
          });
        } else {
          return res.status(400).json({
            success: false,
            message: rewardCodeResult.error || 'Mã đổi thưởng không hợp lệ',
            data: null,
          });
        }
      }

      // Regular discount code from billing service
      const discountCode = await prisma.discountCode.findUnique({
        where: { code: codeUpper },
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

      // IMPROVEMENT: Check if this is a trial code
      const isTrialCode =
        discountCode.code.toUpperCase().startsWith('TRIAL-') || discountCode.type === 'FREE_TRIAL';

      // Calculate bonus days
      let bonusDays = 0;
      if (discountCode.type === 'FREE_TRIAL' || discountCode.type === 'FIRST_MONTH_FREE') {
        bonusDays = 30; // 1 month free
      } else if (discountCode.bonus_days) {
        bonusDays = discountCode.bonus_days; // Use bonus_days from referral codes
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
          isTrialCode, // IMPROVEMENT: Flag to indicate trial code
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

  // Discount Codes Management - CRUD Operations
  async getAllDiscountCodes(req, res) {
    try {
      const { limit = 100, offset = 0, is_active, search } = req.query;

      const parsedLimit = Math.min(parseInt(limit) || 100, 200);
      const parsedOffset = Math.max(parseInt(offset) || 0, 0);

      const where = {};
      if (is_active !== undefined) {
        where.is_active = is_active === 'true' || is_active === true;
      }
      if (search) {
        where.OR = [
          { code: { contains: search, mode: 'insensitive' } },
          { name: { contains: search, mode: 'insensitive' } },
          { description: { contains: search, mode: 'insensitive' } },
        ];
      }

      const [discountCodes, total] = await Promise.all([
        prisma.discountCode.findMany({
          where,
          orderBy: { created_at: 'desc' },
          take: parsedLimit,
          skip: parsedOffset,
          include: {
            _count: {
              select: { usage_history: true },
            },
          },
        }),
        prisma.discountCode.count({ where }),
      ]);

      res.json({
        success: true,
        message: 'Discount codes retrieved successfully',
        data: discountCodes,
        pagination: {
          total,
          limit: parsedLimit,
          offset: parsedOffset,
          hasMore: parsedOffset + parsedLimit < total,
        },
      });
    } catch (error) {
      console.error('Get all discount codes error:', error);
      return this.handleDatabaseError(error, res, 'Get all discount codes');
    }
  }

  async getDiscountCodeById(req, res) {
    try {
      const { id } = req.params;

      const discountCode = await prisma.discountCode.findUnique({
        where: { id },
        include: {
          usage_history: {
            orderBy: { used_at: 'desc' },
            take: 100,
            include: {
              discount_code: {
                select: {
                  code: true,
                  name: true,
                },
              },
            },
          },
          _count: {
            select: { usage_history: true },
          },
        },
      });

      if (!discountCode) {
        return res.status(404).json({
          success: false,
          message: 'Discount code not found',
          data: null,
        });
      }

      res.json({
        success: true,
        message: 'Discount code retrieved successfully',
        data: discountCode,
      });
    } catch (error) {
      console.error('Get discount code by id error:', error);
      return this.handleDatabaseError(error, res, 'Get discount code by id');
    }
  }

  async createDiscountCode(req, res) {
    try {
      const {
        code,
        name,
        description,
        type,
        value,
        max_discount,
        usage_limit,
        usage_limit_per_member,
        valid_from,
        valid_until,
        is_active = true,
        applicable_plans = [],
        minimum_amount,
        first_time_only = false,
        referrer_member_id,
        bonus_days,
        referral_reward,
      } = req.body;

      if (!code || !name || !type || value === undefined) {
        return res.status(400).json({
          success: false,
          message: 'Code, name, type, and value are required',
          data: null,
        });
      }

      // Check if code already exists
      const existingCode = await prisma.discountCode.findUnique({
        where: { code: code.toUpperCase().trim() },
      });

      if (existingCode) {
        return res.status(400).json({
          success: false,
          message: 'Discount code already exists',
          data: null,
        });
      }

      const discountCode = await prisma.discountCode.create({
        data: {
          code: code.toUpperCase().trim(),
          name,
          description,
          type,
          value,
          max_discount: max_discount ? parseFloat(max_discount) : null,
          usage_limit: usage_limit ? parseInt(usage_limit) : null,
          usage_limit_per_member: usage_limit_per_member ? parseInt(usage_limit_per_member) : null,
          valid_from: valid_from ? new Date(valid_from) : new Date(),
          valid_until: valid_until ? new Date(valid_until) : null,
          is_active,
          applicable_plans: Array.isArray(applicable_plans) ? applicable_plans : [],
          minimum_amount: minimum_amount ? parseFloat(minimum_amount) : null,
          first_time_only,
          referrer_member_id: referrer_member_id || null,
          bonus_days: bonus_days ? parseInt(bonus_days) : null,
          referral_reward: referral_reward ? parseFloat(referral_reward) : null,
        },
      });

      res.status(201).json({
        success: true,
        message: 'Discount code created successfully',
        data: discountCode,
      });
    } catch (error) {
      console.error('Create discount code error:', error);
      return this.handleDatabaseError(error, res, 'Create discount code');
    }
  }

  async updateDiscountCode(req, res) {
    try {
      const { id } = req.params;
      const {
        code,
        name,
        description,
        type,
        value,
        max_discount,
        usage_limit,
        usage_limit_per_member,
        valid_from,
        valid_until,
        is_active,
        applicable_plans,
        minimum_amount,
        first_time_only,
        referrer_member_id,
        bonus_days,
        referral_reward,
      } = req.body;

      // Check if discount code exists
      const existingCode = await prisma.discountCode.findUnique({
        where: { id },
      });

      if (!existingCode) {
        return res.status(404).json({
          success: false,
          message: 'Discount code not found',
          data: null,
        });
      }

      // Check if new code conflicts with existing code
      if (code && code.toUpperCase().trim() !== existingCode.code) {
        const codeConflict = await prisma.discountCode.findUnique({
          where: { code: code.toUpperCase().trim() },
        });

        if (codeConflict) {
          return res.status(400).json({
            success: false,
            message: 'Discount code already exists',
            data: null,
          });
        }
      }

      const updateData = {};
      if (code !== undefined) updateData.code = code.toUpperCase().trim();
      if (name !== undefined) updateData.name = name;
      if (description !== undefined) updateData.description = description;
      if (type !== undefined) updateData.type = type;
      if (value !== undefined) updateData.value = parseFloat(value);
      if (max_discount !== undefined)
        updateData.max_discount = max_discount ? parseFloat(max_discount) : null;
      if (usage_limit !== undefined)
        updateData.usage_limit = usage_limit ? parseInt(usage_limit) : null;
      if (usage_limit_per_member !== undefined)
        updateData.usage_limit_per_member = usage_limit_per_member
          ? parseInt(usage_limit_per_member)
          : null;
      if (valid_from !== undefined) updateData.valid_from = new Date(valid_from);
      if (valid_until !== undefined)
        updateData.valid_until = valid_until ? new Date(valid_until) : null;
      if (is_active !== undefined) updateData.is_active = is_active;
      if (applicable_plans !== undefined)
        updateData.applicable_plans = Array.isArray(applicable_plans) ? applicable_plans : [];
      if (minimum_amount !== undefined)
        updateData.minimum_amount = minimum_amount ? parseFloat(minimum_amount) : null;
      if (first_time_only !== undefined) updateData.first_time_only = first_time_only;
      if (referrer_member_id !== undefined)
        updateData.referrer_member_id = referrer_member_id || null;
      if (bonus_days !== undefined)
        updateData.bonus_days = bonus_days ? parseInt(bonus_days) : null;
      if (referral_reward !== undefined)
        updateData.referral_reward = referral_reward ? parseFloat(referral_reward) : null;

      const discountCode = await prisma.discountCode.update({
        where: { id },
        data: updateData,
      });

      res.json({
        success: true,
        message: 'Discount code updated successfully',
        data: discountCode,
      });
    } catch (error) {
      console.error('Update discount code error:', error);
      return this.handleDatabaseError(error, res, 'Update discount code');
    }
  }

  async deleteDiscountCode(req, res) {
    try {
      const { id } = req.params;

      // Check if discount code exists
      const existingCode = await prisma.discountCode.findUnique({
        where: { id },
        include: {
          _count: {
            select: { usage_history: true },
          },
        },
      });

      if (!existingCode) {
        return res.status(404).json({
          success: false,
          message: 'Discount code not found',
          data: null,
        });
      }

      // Check if code has been used
      if (existingCode._count.usage_history > 0) {
        // Instead of deleting, just deactivate
        const discountCode = await prisma.discountCode.update({
          where: { id },
          data: { is_active: false },
        });

        return res.json({
          success: true,
          message:
            'Discount code has been used and cannot be deleted. It has been deactivated instead.',
          data: discountCode,
        });
      }

      // Delete if not used
      await prisma.discountCode.delete({
        where: { id },
      });

      res.json({
        success: true,
        message: 'Discount code deleted successfully',
        data: null,
      });
    } catch (error) {
      console.error('Delete discount code error:', error);
      return this.handleDatabaseError(error, res, 'Delete discount code');
    }
  }

  async getDiscountCodeUsageHistory(req, res) {
    try {
      const { id } = req.params;
      const { limit = 100, offset = 0, member_id } = req.query;

      const parsedLimit = Math.min(parseInt(limit) || 100, 200);
      const parsedOffset = Math.max(parseInt(offset) || 0, 0);

      // Check if discount code exists
      const discountCode = await prisma.discountCode.findUnique({
        where: { id },
      });

      if (!discountCode) {
        return res.status(404).json({
          success: false,
          message: 'Discount code not found',
          data: null,
        });
      }

      const where = {
        discount_code_id: id,
        ...(member_id && { member_id }),
      };

      const [usageHistory, total] = await Promise.all([
        prisma.discountUsage.findMany({
          where,
          orderBy: { used_at: 'desc' },
          take: parsedLimit,
          skip: parsedOffset,
          include: {
            discount_code: {
              select: {
                code: true,
                name: true,
              },
            },
          },
        }),
        prisma.discountUsage.count({ where }),
      ]);

      res.json({
        success: true,
        message: 'Discount code usage history retrieved successfully',
        data: usageHistory,
        pagination: {
          total,
          limit: parsedLimit,
          offset: parsedOffset,
          hasMore: parsedOffset + parsedLimit < total,
        },
      });
    } catch (error) {
      console.error('Get discount code usage history error:', error);
      return this.handleDatabaseError(error, res, 'Get discount code usage history');
    }
  }

  // Payment Gateway Integration
  async initiatePayment(req, res) {
    try {
      const {
        member_id,
        subscription_id,
        amount,
        payment_method,
        payment_type = 'SUBSCRIPTION', // Support CLASS_BOOKING, ADDON_PURCHASE, etc.
        reference_id, // Booking ID, invoice ID, etc.
        description,
        return_url,
        cancel_url,
        reward_redemption_id, // Reward redemption ID if payment is for reward redemption
        metadata, // Additional metadata if provided
      } = req.body;

      if (!member_id || !amount || !payment_method) {
        return res.status(400).json({
          success: false,
          message: 'Thiếu thông tin bắt buộc',
          data: null,
        });
      }

      // Validate subscription_id if payment_type is SUBSCRIPTION
      if (payment_type === 'SUBSCRIPTION' && !subscription_id) {
        console.warn(
          '[WARNING] [INITIATE_PAYMENT] subscription_id is missing for SUBSCRIPTION payment type'
        );
      }

      // Create pending payment record
      const payment = await prisma.payment.create({
        data: {
          subscription_id: subscription_id || null,
          member_id,
          amount,
          currency: 'VND',
          status: 'PENDING',
          payment_method,
          payment_type, // Can be SUBSCRIPTION, CLASS_BOOKING, etc.
          reference_id, // Link to booking, invoice, etc.
          description,
          net_amount: amount,
          // Store reward redemption ID and other metadata if provided
          metadata:
            reward_redemption_id || metadata
              ? {
                  ...(reward_redemption_id ? { reward_redemption_id } : {}),
                  ...(metadata || {}),
                }
              : null,
        },
      });

      console.log('[SUCCESS] [INITIATE_PAYMENT] Payment created:', {
        payment_id: payment.id,
        subscription_id: payment.subscription_id,
        member_id: payment.member_id,
        payment_type: payment.payment_type,
        reference_id: payment.reference_id,
        amount: payment.amount,
        description: payment.description,
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

      // Ensure subscription_id is included in response
      const paymentResponse = {
        ...payment,
        subscription_id: payment.subscription_id || subscription_id || null,
      };

      res.json({
        success: true,
        message: 'Khởi tạo thanh toán thành công',
        data: {
          payment: paymentResponse,
          paymentUrl,
          gatewayData,
        },
      });
    } catch (error) {
      console.error('[ERROR] [INITIATE_PAYMENT] Payment creation failed:', {
        error: error.message,
        stack: error.stack,
        code: error.code,
        meta: error.meta,
        requestBody: {
          member_id: req.body?.member_id,
          payment_type: req.body?.payment_type,
          reference_id: req.body?.reference_id,
          amount: req.body?.amount,
        },
      });
      res.status(500).json({
        success: false,
        message: 'Lỗi khi khởi tạo thanh toán',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined,
        data: null,
      });
    }
  }

  async handlePaymentWebhook(req, res) {
    const webhookId = req.webhookId || req.body?.transaction_id || req.body?.id;
    const requestId = `webhook-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    // Structured logging context
    const logContext = {
      requestId,
      webhookId,
      paymentId: req.body?.payment_id,
      timestamp: new Date().toISOString(),
    };

    try {
      const { payment_id, status, transaction_id, gateway, receipt_url, payment_intent } = req.body;

      console.log('📨 [WEBHOOK] Received payment webhook:', {
        ...logContext,
        status,
        gateway,
      });

      if (!payment_id || !status) {
        console.error('[ERROR] [WEBHOOK] Missing required fields:', logContext);
        return res.status(400).json({
          success: false,
          message: 'Thiếu thông tin webhook',
        });
      }

      // Mark webhook as processed (idempotency)
      if (webhookId) {
        await redisService.markWebhookProcessed(webhookId);
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
        console.error('[ERROR] [WEBHOOK] Payment not found:', logContext);
        return res.status(404).json({
          success: false,
          message: 'Không tìm thấy thanh toán',
        });
      }

      // TC-PAY-007: Validate payment amount mismatch
      const webhookAmount = req.body.amount ? parseFloat(req.body.amount) : null;
      if (webhookAmount !== null) {
        const expectedAmount = parseFloat(payment.amount);
        const amountMatch = Math.abs(webhookAmount - expectedAmount) < 0.01; // Allow 0.01 difference for floating point

        if (!amountMatch) {
          console.error('[ERROR] [WEBHOOK] Payment amount mismatch:', {
            ...logContext,
            expected: expectedAmount,
            received: webhookAmount,
            difference: Math.abs(webhookAmount - expectedAmount),
          });

          // Update payment with failure reason
          await prisma.payment.update({
            where: { id: payment_id },
            data: {
              status: 'FAILED',
              failed_at: new Date(),
              failure_reason: `Amount mismatch: expected ${expectedAmount}, received ${webhookAmount}`,
              metadata: {
                ...(payment.metadata || {}),
                webhook_received_at: new Date().toISOString(),
                webhook_id: webhookId,
                request_id: requestId,
                amount_mismatch: true,
                expected_amount: expectedAmount,
                received_amount: webhookAmount,
              },
            },
          });

          return res.status(400).json({
            success: false,
            message: 'Payment amount mismatch',
            errorCode: 'PAYMENT_AMOUNT_MISMATCH',
            data: {
              expected: expectedAmount,
              received: webhookAmount,
            },
          });
        }
      }

      // Store payment intent/receipt in metadata
      const metadata = {
        ...(payment.metadata || {}),
        webhook_received_at: new Date().toISOString(),
        webhook_id: webhookId,
        request_id: requestId,
        ...(receipt_url && { receipt_url }),
        ...(payment_intent && { payment_intent }),
      };

      // Update payment status
      const updateData = {
        status: status === 'SUCCESS' ? 'COMPLETED' : 'FAILED',
        transaction_id,
        gateway,
        metadata,
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

      console.log('[SUCCESS] [WEBHOOK] Payment status updated:', {
        ...logContext,
        newStatus: updatedPayment.status,
      });

      // Award points for successful payment (2% of payment amount)
      if (status === 'SUCCESS' && updatedPayment.status === 'COMPLETED' && payment.member_id) {
        try {
          const paymentAmount = parseFloat(payment.amount);
          const pointsToAward = Math.round(paymentAmount * 0.02); // 2% of payment amount

          if (pointsToAward > 0) {
            const axios = require('axios');
            const memberServiceUrl = process.env.MEMBER_SERVICE_URL || 'http://member:3002';

            const pointsResponse = await axios.post(
              `${memberServiceUrl}/members/${payment.member_id}/points/award`,
              {
                points: pointsToAward,
                source: 'PAYMENT',
                source_id: payment.id,
                description: `Thanh toán thành công: ${paymentAmount.toLocaleString('vi-VN')} VNĐ`,
              },
              {
                timeout: 5000,
                headers: {
                  'Content-Type': 'application/json',
                },
              }
            );

            if (pointsResponse.data?.success) {
              console.log(
                `[POINTS] Awarded ${pointsToAward} points to member ${payment.member_id} for payment ${payment.id}`
              );
            } else {
              console.warn(
                `[WARNING] Failed to award points for payment: ${
                  pointsResponse.data?.message || 'Unknown error'
                }`
              );
            }
          }
        } catch (pointsError) {
          console.error('[ERROR] Failed to award points for payment:', {
            ...logContext,
            error: pointsError.message,
            member_id: payment.member_id,
            payment_amount: payment.amount,
          });
          // Don't fail webhook if points award fails
        }
      }

      // IMPROVEMENT: Generate and send payment receipt if payment successful
      if (status === 'SUCCESS') {
        try {
          // Create invoice if not exists
          let invoice = await prisma.invoice.findFirst({
            where: { payment_id: payment.id },
          });

          if (!invoice && payment.subscription) {
            invoice = await prisma.invoice.create({
              data: {
                subscription_id: payment.subscription_id,
                payment_id: payment.id,
                member_id: payment.member_id,
                invoice_number: `INV-${new Date().getFullYear()}-${Date.now()}`,
                status: 'PAID',
                type: 'SUBSCRIPTION',
                subtotal: parseFloat(payment.amount),
                total_amount: parseFloat(payment.amount),
                due_date: new Date(),
                paid_date: new Date(),
                line_items: {
                  items: [
                    {
                      description: payment.subscription.plan?.name || 'Subscription',
                      quantity: 1,
                      unit_price: parseFloat(payment.amount),
                      total: parseFloat(payment.amount),
                    },
                  ],
                },
              },
            });
          }

          // IMPROVEMENT: Send receipt email
          if (invoice) {
            try {
              const memberService = require('../../../../member-service/src/services/member.service.js');
              const member = await memberService.getMemberById(payment.member_id);

              if (member?.email) {
                // Send receipt email via notification service
                await notificationService.sendNotification({
                  user_id: member.user_id,
                  type: 'PAYMENT_RECEIPT',
                  title: 'Hóa đơn thanh toán',
                  message: `Cảm ơn bạn đã thanh toán. Hóa đơn số ${invoice.invoice_number} đã được gửi đến email của bạn.`,
                  data: {
                    payment_id: payment.id,
                    invoice_id: invoice.id,
                    invoice_number: invoice.invoice_number,
                    amount: parseFloat(payment.amount),
                    payment_date: payment.processed_at || new Date(),
                  },
                  channels: ['EMAIL'],
                });
              }
            } catch (receiptError) {
              console.error('[ERROR] Failed to send payment receipt:', receiptError);
              // Don't fail webhook if receipt fails
            }
          }
        } catch (invoiceError) {
          console.error('[ERROR] Failed to create invoice for payment:', invoiceError);
          // Don't fail webhook if invoice creation fails
        }
      }

      // If payment successful, process subscription
      if (status === 'SUCCESS' && payment.subscription) {
        // Check if this is a renewal payment (check metadata)
        const isRenewal = payment.metadata?.renewal_type === 'MANUAL';

        if (isRenewal && payment.metadata?.new_end_date) {
          // This is a renewal payment - update subscription dates
          const newStartDate = new Date(payment.metadata.new_start_date);
          const newEndDate = new Date(payment.metadata.new_end_date);

          const updatedSubscription = await prisma.subscription.update({
            where: { id: payment.subscription.id },
            data: {
              status: 'ACTIVE',
              end_date: newEndDate,
              current_period_start: newStartDate,
              current_period_end: newEndDate,
              next_billing_date: newEndDate,
            },
          });

          // Update invoice status to PAID
          const invoice = await prisma.invoice.findFirst({
            where: { payment_id: payment.id },
          });

          if (invoice) {
            await prisma.invoice.update({
              where: { id: invoice.id },
              data: {
                status: 'PAID',
                paid_date: new Date(),
              },
            });
            console.log('[SUCCESS] [WEBHOOK] Invoice status updated to PAID:', {
              ...logContext,
              invoice_id: invoice.id,
            });
          } else {
            console.warn('[WARNING] [WEBHOOK] No invoice found for payment:', {
              ...logContext,
              payment_id: payment.id,
            });
          }

          console.log('[SUCCESS] Subscription renewed via payment completion:', {
            subscription_id: updatedSubscription.id,
            new_end_date: newEndDate,
          });

          // Create notification for member
          try {
            await notificationService.createSubscriptionNotification({
              userId: payment.member_id,
              subscriptionId: updatedSubscription.id,
              planName: payment.subscription.plan?.name || 'Gói đăng ký',
              planType: payment.subscription.plan?.type || 'BASIC',
              action: 'renewed',
            });
          } catch (notificationError) {
            console.error(
              '[ERROR] Error creating subscription renewal notification:',
              notificationError
            );
          }
        } else {
          // Regular subscription activation
          const updatedSubscription = await prisma.subscription.update({
            where: { id: payment.subscription.id },
            data: { status: 'ACTIVE' },
          });

          // Create notification for member
          try {
            await notificationService.createSubscriptionNotification({
              userId: payment.member_id,
              subscriptionId: updatedSubscription.id,
              planName: payment.subscription.plan?.name || 'Gói đăng ký',
              planType: payment.subscription.plan?.type || 'BASIC',
              action: 'created',
            });
          } catch (notificationError) {
            console.error('[ERROR] Error creating subscription notification:', notificationError);
          }
        }

        // Create payment notification
        try {
          await notificationService.createPaymentNotification({
            userId: payment.member_id,
            paymentId: updatedPayment.id,
            amount: parseFloat(updatedPayment.amount),
            status: 'SUCCESS',
            paymentMethod: updatedPayment.payment_method,
            subscriptionId: payment.subscription_id,
          });
        } catch (notificationError) {
          console.error('[ERROR] Error creating payment notification:', notificationError);
        }

        // Mark reward redemption as used if payment used a reward code
        // Check payment metadata for reward_redemption_id
        const rewardRedemptionId = payment.metadata?.reward_redemption_id;
        if (rewardRedemptionId) {
          try {
            const markResult = await rewardDiscountService.markRedemptionAsUsed(
              rewardRedemptionId,
              updatedSubscription.id
            );
            if (markResult.success) {
              console.log('[SUCCESS] Reward redemption marked as used:', rewardRedemptionId);
            } else {
              console.error('[ERROR] Failed to mark reward redemption as used:', markResult.error);
              // Don't fail the webhook if marking fails
            }
          } catch (rewardError) {
            console.error('[ERROR] Error marking reward redemption as used:', rewardError);
            // Don't fail the webhook if marking fails
          }
        }

        // TC-DISCOUNT-REFERRAL-002: Credit referral reward to referrer when payment completed
        try {
          const discountUsage = await prisma.discountUsage.findFirst({
            where: {
              subscription_id: payment.subscription_id,
              referrer_member_id: { not: null },
              referrer_reward: { not: null },
            },
            include: {
              discount_code: {
                select: {
                  id: true,
                  code: true,
                  referrer_member_id: true,
                  referral_reward: true,
                },
              },
            },
          });

          if (discountUsage && discountUsage.referrer_member_id && discountUsage.referrer_reward) {
            console.log('[REFERRAL] Processing referral reward:', {
              referrer_member_id: discountUsage.referrer_member_id,
              referral_reward: discountUsage.referrer_reward,
              referee_member_id: payment.member_id,
              subscription_id: payment.subscription_id,
            });

            // Credit points to referrer via Member Service
            const memberServiceUrl = process.env.MEMBER_SERVICE_URL;
            if (memberServiceUrl) {
              try {
                const rewardAmount = Number(discountUsage.referrer_reward);
                const creditResponse = await axios.post(
                  `${memberServiceUrl}/members/${discountUsage.referrer_member_id}/points/credit`,
                  {
                    amount: rewardAmount,
                    source: 'REFERRAL_REWARD',
                    description: `Phần thưởng giới thiệu từ mã ${discountUsage.discount_code.code}`,
                    metadata: {
                      referee_member_id: payment.member_id,
                      subscription_id: payment.subscription_id,
                      discount_code_id: discountUsage.discount_code_id,
                    },
                  },
                  { timeout: 5000 }
                );

                if (creditResponse.data?.success) {
                  console.log('[SUCCESS] Referral reward credited to referrer:', {
                    referrer_member_id: discountUsage.referrer_member_id,
                    amount: rewardAmount,
                  });
                } else {
                  console.error('[ERROR] Failed to credit referral reward:', creditResponse.data);
                }
              } catch (creditError) {
                console.error('[ERROR] Error crediting referral reward:', creditError.message);
                // Don't fail the webhook if credit fails - can retry later
              }
            }
          }
        } catch (referralError) {
          console.error('[ERROR] Error processing referral reward:', referralError);
          // Don't fail the webhook if referral processing fails
        }

        // Call Member Service to update member membership
        // Use transaction pattern with rollback/compensation
        const memberServiceUrl = process.env.MEMBER_SERVICE_URL;
        let memberUpdateSuccess = false;
        let user_id = null;
        const compensationTaskId = `comp-${payment_id}-${Date.now()}`;

        try {
          // NOTE: payment.member_id in database is Member.id (from member service), not user_id
          // We need to get the member first to find user_id
          try {
            const membersEndpoint = `${memberServiceUrl}/members/${payment.member_id}`;
            const memberResponse = await axios.get(membersEndpoint, {
              timeout: 5000,
            });
            const memberData = memberResponse.data?.data?.member || memberResponse.data?.data;
            user_id = memberData?.user_id;

            if (!user_id) {
              console.error('[ERROR] [WEBHOOK] Cannot find user_id from member data:', {
                ...logContext,
                memberData: memberData ? Object.keys(memberData) : 'null',
              });
              throw new Error('Member data does not contain user_id');
            }

            console.log('[SUCCESS] [WEBHOOK] Found user_id:', { ...logContext, user_id });
          } catch (memberFetchError) {
            console.error('[ERROR] [WEBHOOK] Failed to fetch member to get user_id:', {
              ...logContext,
              error: memberFetchError.message,
              response: memberFetchError.response?.data,
            });
            throw memberFetchError;
          }

          // Update member membership with correct user_id
          const createEndpoint = `${memberServiceUrl}/members/create-with-user`;
          await axios.post(
            createEndpoint,
            {
              user_id: user_id,
              membership_type: payment.subscription.plan.type,
              membership_start_date: payment.subscription.start_date,
              membership_end_date: payment.subscription.end_date,
            },
            {
              timeout: 10000,
            }
          );

          memberUpdateSuccess = true;
          console.log('[SUCCESS] [WEBHOOK] Member membership updated:', {
            ...logContext,
            user_id,
            membership_type: payment.subscription.plan.type,
          });
        } catch (memberError) {
          console.error('[ERROR] [WEBHOOK] Failed to update member membership:', {
            ...logContext,
            error: memberError.message,
            response: memberError.response?.data,
            stack: memberError.stack,
          });

          // Store compensation task for retry
          if (user_id) {
            await redisService.storeCompensationTask(compensationTaskId, {
              payment_id: payment.id,
              user_id: user_id,
              membership_type: payment.subscription.plan.type,
              membership_start_date: payment.subscription.start_date,
              membership_end_date: payment.subscription.end_date,
              retry_count: 0,
              created_at: new Date().toISOString(),
            });
            console.log('[PROCESS] [WEBHOOK] Compensation task stored:', {
              ...logContext,
              compensationTaskId,
            });
          }

          // Rollback payment status if member update fails (optional - depends on business logic)
          // For now, we keep payment as COMPLETED but log the failure
          // The compensation task will retry the member update later
        }

        // Notify admins about successful subscription payment
        try {
          console.log('[NOTIFY] Notifying admins about subscription payment success...');
          if (!process.env.SCHEDULE_SERVICE_URL) {
            throw new Error(
              'SCHEDULE_SERVICE_URL environment variable is required. Please set it in your .env file.'
            );
          }
          const scheduleServiceUrl = process.env.SCHEDULE_SERVICE_URL;

          // Get member info if available (payment.member_id might be user_id or member_id)
          let memberInfo = null;
          try {
            const memberResponse = await axios.get(
              `${memberServiceUrl}/members/${payment.member_id}`,
              {
                timeout: 5000,
              }
            );
            memberInfo = memberResponse.data?.data?.member || memberResponse.data?.data;
          } catch (memberInfoError) {
            // Try to get by user_id if member_id fails
            try {
              // payment.member_id might be user_id, so try to get member by user_id
              if (!process.env.IDENTITY_SERVICE_URL) {
                throw new Error(
                  'IDENTITY_SERVICE_URL environment variable is required. Please set it in your .env file.'
                );
              }
              const identityServiceUrl = process.env.IDENTITY_SERVICE_URL;
              const userResponse = await axios.get(
                `${identityServiceUrl}/users/${payment.member_id}`,
                {
                  timeout: 5000,
                }
              );
              memberInfo = userResponse.data?.data?.user || userResponse.data?.data;
            } catch (userInfoError) {
              console.log('Could not fetch member/user info for notification');
            }
          }

          // Call schedule service to notify admins
          await axios.post(
            `${scheduleServiceUrl}/notifications/subscription-payment-success`,
            {
              payment_id: payment.id,
              member_id: payment.member_id,
              user_id: memberInfo?.user_id || payment.member_id,
              amount: parseFloat(payment.amount),
              plan_type: payment.subscription.plan.type,
              plan_name: payment.subscription.plan.name,
              member_name: memberInfo?.full_name || memberInfo?.firstName || null,
              member_email: memberInfo?.email || null,
            },
            {
              headers: {
                'Content-Type': 'application/json',
              },
              timeout: 10000,
            }
          );
          console.log('[SUCCESS] Successfully notified admins about subscription payment');
        } catch (notifyError) {
          console.error(
            '[ERROR] Failed to notify admins about subscription payment:',
            notifyError.message
          );
          // Don't fail the webhook if notification fails
        }

        // Emit Socket.IO event for real-time updates
        if (global.io && user_id) {
          try {
            global.io.to(`user:${user_id}`).emit('payment:completed', {
              payment_id: updatedPayment.id,
              amount: parseFloat(updatedPayment.amount),
              status: updatedPayment.status,
              subscription_id: payment.subscription_id,
              timestamp: new Date().toISOString(),
            });
            console.log('[EMIT] [WEBHOOK] Socket event emitted:', {
              ...logContext,
              user_id,
            });
          } catch (socketError) {
            console.error('[ERROR] [WEBHOOK] Error emitting socket event:', {
              ...logContext,
              error: socketError.message,
            });
          }
        }
      }

      // Audit log
      console.log('[LIST] [WEBHOOK] Payment webhook processed successfully:', {
        ...logContext,
        paymentStatus: updatedPayment.status,
        hasSubscription: !!payment.subscription,
      });

      res.json({
        success: true,
        message: 'Webhook xử lý thành công',
        data: updatedPayment,
      });
    } catch (error) {
      console.error('[ERROR] [WEBHOOK] Payment webhook error:', {
        ...logContext,
        error: error.message,
        stack: error.stack,
        body: req.body,
      });

      // Log full error context (mask sensitive data)
      const errorContext = {
        ...logContext,
        errorType: error.name,
        errorMessage: error.message,
        paymentId: req.body?.payment_id,
        // Don't log full request body in production
        ...(process.env.NODE_ENV !== 'production' && { requestBody: req.body }),
      };

      res.status(500).json({
        success: false,
        message: 'Lỗi khi xử lý webhook',
        ...(process.env.NODE_ENV !== 'production' && { error: error.message }),
      });
    }
  }

  // Enhanced subscription creation with discount support
  async createSubscriptionWithDiscount(req, res) {
    try {
      console.log('[DATA] Request body:', req.body);
      const { member_id, plan_id, start_date, discount_code, bonus_days = 0 } = req.body;
      console.log('[CONFIG] Extracted member_id:', member_id, 'plan_id:', plan_id);

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
          console.log('[INFO] Member already has valid subscription, returning existing one');
          return res.json({
            success: true,
            message: 'Member đã có subscription đang hoạt động',
            ...existingSubscription,
          });
        }

        // If subscription exists but payment not completed, we'll update it below
        console.log('[INFO] Member has pending subscription, will update it');
      }

      // Get plan details
      const plan = await prisma.membershipPlan.findUnique({
        where: { id: plan_id },
      });

      if (!plan) {
        return res.status(404).json({
          success: false,
          message: 'Không tìm thấy gói hội viên',
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
      let discountCodeRecord = null;
      let rewardRedemptionId = null; // Track if using reward redemption code

      // Get discount code if provided
      if (discount_code) {
        const codeUpper = discount_code.toUpperCase().trim();

        // Check if this is a reward redemption code (format: REWARD-XXXX-XXXX)
        if (codeUpper.startsWith('REWARD-')) {
          console.log('[GIFT] Checking reward redemption code:', codeUpper);
          const rewardCodeResult = await rewardDiscountService.verifyRewardCode(
            codeUpper,
            member_id
          );

          if (rewardCodeResult.success && rewardCodeResult.discount) {
            const rewardDiscount = rewardCodeResult.discount;
            rewardRedemptionId = rewardCodeResult.redemption.id;

            // Apply discount from reward
            if (rewardDiscount.type === 'PERCENTAGE') {
              discountAmount = (baseAmount * Number(rewardDiscount.value)) / 100;
              if (rewardDiscount.max_discount) {
                discountAmount = Math.min(discountAmount, Number(rewardDiscount.max_discount));
              }
            } else if (rewardDiscount.type === 'FIXED') {
              discountAmount = Number(rewardDiscount.value);
            }

            totalAmount = Math.max(0, baseAmount - discountAmount);
            console.log('[SUCCESS] Reward discount applied:', {
              type: rewardDiscount.type,
              value: rewardDiscount.value,
              discountAmount,
              redemption_id: rewardRedemptionId,
            });
          } else {
            // Reward code is invalid, return error
            return res.status(400).json({
              success: false,
              message: rewardCodeResult.error || 'Invalid reward redemption code',
              data: null,
            });
          }
        } else {
          // Regular discount code from billing service
          discountCodeRecord = await prisma.discountCode.findUnique({
            where: { code: codeUpper },
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
          }
        }
      }

      // IMPROVEMENT: Check if this is a trial code
      const isTrialCode =
        discount_code &&
        (discount_code.toUpperCase().startsWith('TRIAL-') ||
          (discountCodeRecord && discountCodeRecord.type === 'FREE_TRIAL'));

      // IMPROVEMENT: For trial codes, create TRIAL subscription
      let subscriptionStatus = 'PENDING';
      let trialStart = null;
      let trialEnd = null;

      if (isTrialCode) {
        subscriptionStatus = 'TRIAL';
        trialStart = new Date();
        trialEnd = new Date(trialStart);
        trialEnd.setDate(trialEnd.getDate() + 7); // 7 days trial
        // For trial, start_date is after trial ends
        startDate = new Date(trialEnd);
        endDate = new Date(startDate);
        endDate.setMonth(endDate.getMonth() + plan.duration_months);
        // Trial is free, so total_amount = 0
        totalAmount = 0;
        discountAmount = baseAmount; // Full discount for trial
      }

      // Create or update subscription (upsert for PENDING/CANCELLED/TRIAL)
      const subscription = await prisma.subscription.upsert({
        where: { member_id },
        update: {
          plan_id,
          status: subscriptionStatus,
          start_date: startDate,
          end_date: endDate,
          next_billing_date: endDate,
          current_period_start: startDate,
          current_period_end: endDate,
          base_amount: baseAmount,
          discount_amount: discountAmount,
          total_amount: totalAmount,
          cancelled_at: null,
          cancellation_reason: null,
          cancelled_by: null,
          // IMPROVEMENT: Trial fields
          trial_start: trialStart,
          trial_end: trialEnd,
        },
        create: {
          member_id,
          plan_id,
          status: subscriptionStatus,
          start_date: startDate,
          end_date: endDate,
          next_billing_date: endDate,
          current_period_start: startDate,
          current_period_end: endDate,
          base_amount: baseAmount,
          discount_amount: discountAmount,
          total_amount: totalAmount,
          // IMPROVEMENT: Trial fields
          trial_start: trialStart,
          trial_end: trialEnd,
        },
        include: {
          plan: true,
        },
      });

      // Record discount usage after subscription is created
      if (discountCodeRecord && discountAmount > 0) {
        console.log('[GIFT] Checking for existing discount usage:', {
          discount_code_id: discountCodeRecord.id,
          member_id,
          subscription_id: subscription.id,
        });

        // Check if discount usage already exists for this subscription
        const existingUsage = await prisma.discountUsage.findFirst({
          where: {
            discount_code_id: discountCodeRecord.id,
            member_id,
            subscription_id: subscription.id,
          },
        });

        // Check if subscription already has any discount usage
        const subscriptionHasDiscount = await prisma.discountUsage.findFirst({
          where: {
            member_id,
            subscription_id: subscription.id,
          },
        });

        console.log('[GIFT] Existing usage check result:', {
          found_same_code: !!existingUsage,
          existing_usage_id: existingUsage?.id,
          subscription_has_any_discount: !!subscriptionHasDiscount,
        });

        if (!existingUsage && !subscriptionHasDiscount) {
          console.log('[GIFT] Creating new DiscountUsage...');

          // TC-DISCOUNT-REFERRAL-001: Apply referral reward logic
          const bonusDaysToAdd = discountCodeRecord.bonus_days || 0;
          const referralReward = discountCodeRecord.referral_reward || null;
          const referrerMemberId = discountCodeRecord.referrer_member_id || null;

          // Update subscription end_date with bonus days if not already added
          if (bonusDaysToAdd > 0 && subscription.end_date) {
            const currentEndDate = new Date(subscription.end_date);
            const newEndDate = new Date(currentEndDate);
            newEndDate.setDate(newEndDate.getDate() + bonusDaysToAdd);

            await prisma.subscription.update({
              where: { id: subscription.id },
              data: { end_date: newEndDate },
            });

            console.log(
              `[REFERRAL] Added ${bonusDaysToAdd} bonus days to subscription ${subscription.id}`
            );
          }

          await prisma.discountUsage.create({
            data: {
              discount_code_id: discountCodeRecord.id,
              member_id,
              subscription_id: subscription.id,
              amount_discounted: discountAmount,
              bonus_days_added: bonusDaysToAdd > 0 ? bonusDaysToAdd : null,
              referrer_member_id: referrerMemberId,
              referrer_reward: referralReward,
            },
          });

          // Increment usage count
          await prisma.discountCode.update({
            where: { id: discountCodeRecord.id },
            data: { usage_count: { increment: 1 } },
          });
          console.log('[SUCCESS] DiscountUsage created successfully');

          // TC-DISCOUNT-REFERRAL-002: Credit referral reward to referrer (if payment completed)
          // Note: This will be processed when payment is confirmed in webhook
        } else {
          if (existingUsage) {
            console.log(
              '[WARNING] Same discount code already used for this subscription, skipping'
            );
          } else {
            console.log('[WARNING] Subscription already has a different discount code, skipping');
          }
        }
      }

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
      // For active plans, we usually want all of them, but add limit for safety
      const { limit = 50 } = req.query;
      const parsedLimit = Math.min(parseInt(limit) || 50, 100); // Max 100 plans

      const plans = await prisma.membershipPlan.findMany({
        where: { is_active: true },
        select: {
          id: true,
          name: true,
          description: true,
          type: true,
          duration_months: true,
          price: true,
          benefits: true,
          smart_workout_plans: true,
          is_featured: true,
        },
        orderBy: [{ is_featured: 'desc' }, { price: 'asc' }],
        take: parsedLimit, // Add limit for safety
      });

      res.json({
        success: true,
        message: 'Lấy danh sách gói thành công',
        data: plans,
      });
    } catch (error) {
      console.error('Get active plans error:', error);
      return this.handleDatabaseError(error, res, 'Get active plans');
    }
  }

  // Receipt Download
  async downloadReceipt(req, res) {
    try {
      const { id } = req.params;

      // Get payment with all related data
      const payment = await prisma.payment.findUnique({
        where: { id },
        include: {
          subscription: {
            include: {
              plan: true,
            },
          },
          bank_transfer: true,
          invoice: true, // Include invoice if exists
        },
      });

      if (!payment) {
        return res.status(404).json({
          success: false,
          message: 'Payment not found',
          data: null,
        });
      }

      // Get member information if available
      let member = null;
      if (payment.member_id) {
        try {
          const axios = require('axios');
          const memberServiceUrl = process.env.MEMBER_SERVICE_URL;
          const memberResponse = await axios.get(
            `${memberServiceUrl}/members/${payment.member_id}`
          );
          if (memberResponse.data?.success) {
            member = memberResponse.data.data;
          }
        } catch (error) {
          console.warn('Could not fetch member info for receipt:', error.message);
          // Continue without member info
        }
      }

      // Check if receipt already exists in S3
      let receiptUrl = await receiptService.getReceiptUrl(id);

      // If not exists, generate and upload
      if (!receiptUrl) {
        const { url } = await receiptService.generateAndUploadReceipt(payment, member);
        receiptUrl = url;
      }

      // If S3 is not configured, generate PDF and return directly
      if (!receiptUrl) {
        const pdfBuffer = await receiptService.generateReceipt(payment, member);
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader(
          'Content-Disposition',
          `attachment; filename="receipt-${id.substring(0, 8)}.pdf"`
        );
        return res.send(pdfBuffer);
      }

      // Return S3 URL
      res.json({
        success: true,
        message: 'Receipt URL generated successfully',
        data: {
          receiptUrl: receiptUrl,
          paymentId: id,
        },
      });
    } catch (error) {
      console.error('Download receipt error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to generate receipt',
        data: null,
      });
    }
  }

  // Statistics and Reports
  async getStats(req, res) {
    try {
      // Calculate date range for monthly revenue (current month)
      const now = new Date();
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);

      // Use findMany + reduce instead of aggregate to avoid Prisma Decimal issues
      // Include all successful payment statuses, including REFUNDED and PARTIALLY_REFUNDED
      // because refunds will be subtracted separately later
      // Execute queries sequentially to reduce connection pool pressure
      // Start with lighter queries first
      const totalPlans = await this.withTimeout(
        () => prisma.membershipPlan.count({ where: { is_active: true } }),
        10000,
        'Count active plans',
        2
      );

      const activeSubscriptions = await this.withTimeout(
        () => prisma.subscription.count({ where: { status: 'ACTIVE' } }),
        10000,
        'Count active subscriptions',
        2
      );

      // Heavier queries can run in parallel as they're fewer (3 queries)
      const [totalRevenuePayments, monthlyRevenuePayments, pendingPayments] = await Promise.all([
        this.withTimeout(
          () =>
            prisma.payment.findMany({
              where: {
                status: {
                  in: ['COMPLETED', 'REFUNDED', 'PARTIALLY_REFUNDED'],
                },
              },
              select: {
                amount: true,
              },
            }),
          15000,
          'Get total revenue payments',
          2
        ),
        this.withTimeout(
          () =>
            prisma.payment.findMany({
              where: {
                status: {
                  in: ['COMPLETED', 'REFUNDED', 'PARTIALLY_REFUNDED'],
                },
                created_at: {
                  gte: startOfMonth,
                  lte: endOfMonth,
                },
              },
              select: {
                amount: true,
              },
            }),
          15000,
          'Get monthly revenue payments',
          2
        ),
        this.withTimeout(
          () => prisma.payment.count({ where: { status: 'PENDING' } }),
          10000,
          'Count pending payments',
          2
        ),
      ]);

      // Calculate totals from payments
      const totalRevenue = {
        _sum: {
          amount: totalRevenuePayments.reduce((sum, p) => sum + parseFloat(p.amount || 0), 0),
        },
      };
      const monthlyRevenue = {
        _sum: {
          amount: monthlyRevenuePayments.reduce((sum, p) => sum + parseFloat(p.amount || 0), 0),
        },
      };

      res.json({
        success: true,
        message: 'Billing statistics retrieved successfully',
        data: {
          total_plans: totalPlans,
          active_subscriptions: activeSubscriptions,
          total_revenue: Number(totalRevenue._sum.amount || 0),
          monthly_revenue: Number(monthlyRevenue._sum.amount || 0),
          pending_payments: pendingPayments,
        },
      });
    } catch (error) {
      return this.handleDatabaseError(error, res, 'Get stats');
    }
  }

  /**
   * Manually trigger subscription expiration job
   * POST /jobs/subscriptions/expire
   */
  async runSubscriptionExpirationJob(req, res) {
    try {
      const subscriptionExpirationJob = require('../jobs/subscription-expiration.job');

      console.log('[MANUAL] Running subscription expiration job manually...');
      const result = await subscriptionExpirationJob.runExpirationJob();

      if (result.success) {
        return res.json({
          success: true,
          message: `Subscription expiration job completed successfully. ${result.expiredCount} subscription(s) expired.`,
          data: result,
        });
      } else {
        return res.status(500).json({
          success: false,
          message: 'Subscription expiration job failed',
          error: result.error,
          data: result,
        });
      }
    } catch (error) {
      console.error('[ERROR] Manual subscription expiration job error:', error);
      return this.handleDatabaseError(error, res, 'Run subscription expiration job');
    }
  }
}

module.exports = { BillingController };
