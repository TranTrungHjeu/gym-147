const { prisma } = require('../lib/prisma.js');
const revenueReportService = require('../services/revenue-report.service.js');
const memberAnalyticsService = require('../services/member-analytics.service.js');
const reportExportService = require('../services/report-export.service.js');

// Ensure prisma is available
if (!prisma) {
  console.error('Prisma client not initialized');
}

class AnalyticsController {
  /**
   * Helper function to wrap Prisma queries with timeout and retry for connection errors
   * @param {Function} queryFn - Function that returns the Prisma query promise
   * @param {number} timeoutMs - Timeout in milliseconds (default: 10000)
   * @param {string} queryName - Name of the query for logging
   * @param {number} maxRetries - Maximum retries for connection errors (default: 1)
   * @returns {Promise} Query result or throws error
   */
  async withTimeout(queryFn, timeoutMs = 10000, queryName = 'Query', maxRetries = 1) {
    const { reconnectDatabase, checkConnectionHealth } = require('../lib/prisma.js');

    const executeQuery = async (attempt = 0) => {
      try {
        // Don't check connection health before every query - Prisma manages its own pool
        // Only reconnect if we get a connection error
        // This prevents creating unnecessary connections

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
          const retryDelay = 2000 * (attempt + 1); // Exponential backoff: 2s, 4s, 6s...
          console.log(
            `[RETRY] Retrying ${queryName} after connection error (attempt ${
              attempt + 1
            }/${maxRetries}, delay ${retryDelay}ms): ${error.message}`
          );

          // Don't force reconnect - Prisma will handle connection pool automatically
          // Forcing reconnect creates more connections
          // Just wait and retry, Prisma connection pool will recover

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

  /**
   * Get dashboard analytics for admin
   */
  async getDashboardAnalytics(req, res) {
    try {
      const { period = '30' } = req.query;
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - parseInt(period));

      // Use Promise.allSettled to handle partial failures gracefully
      // Each query has its own timeout to prevent one slow query from blocking others
      // Queries are wrapped in functions to allow retry on connection errors
      const results = await Promise.allSettled([
        // Total revenue
        // Include all successful payment statuses, including REFUNDED and PARTIALLY_REFUNDED
        // because refunds will be subtracted separately later
        // Use findMany + reduce instead of aggregate to avoid Prisma Decimal issues
        this.withTimeout(
          async () => {
            const payments = await prisma.payment.findMany({
              where: {
                status: {
                  in: ['COMPLETED', 'REFUNDED', 'PARTIALLY_REFUNDED'],
                },
                created_at: { gte: startDate },
              },
              select: {
                amount: true,
              },
            });
            return {
              _sum: {
                amount: payments.reduce((sum, p) => sum + parseFloat(p.amount || 0), 0),
              },
              _count: {
                id: payments.length,
              },
            };
          },
          15000, // 15 seconds timeout
          'Total revenue aggregate',
          1 // 1 retry for connection errors
        ),

        // Active subscriptions
        this.withTimeout(
          () =>
            prisma.subscription.count({
              where: { status: 'ACTIVE' },
            }),
          10000, // 10 seconds timeout
          'Active subscriptions count',
          1 // 1 retry for connection errors
        ),

        // Total members with subscriptions
        this.withTimeout(
          () =>
            prisma.subscription.groupBy({
              by: ['member_id'],
              where: {
                created_at: { gte: startDate },
              },
            }),
          15000, // 15 seconds timeout
          'Total members groupBy',
          1 // 1 retry for connection errors
        ),

        // Revenue by type
        // Include all successful payment statuses, including REFUNDED and PARTIALLY_REFUNDED
        // because refunds will be subtracted separately later
        this.withTimeout(
          () =>
            prisma.payment.groupBy({
              by: ['payment_type'],
              where: {
                status: {
                  in: ['COMPLETED', 'REFUNDED', 'PARTIALLY_REFUNDED'],
                },
                created_at: { gte: startDate },
              },
              _sum: { amount: true },
              _count: { id: true },
            }),
          15000, // 15 seconds timeout
          'Revenue by type groupBy',
          1 // 1 retry for connection errors
        ),

        // Payment stats
        this.withTimeout(
          () =>
            prisma.payment.groupBy({
              by: ['status'],
              where: {
                created_at: { gte: startDate },
              },
              _count: { id: true },
            }),
          15000, // 15 seconds timeout
          'Payment stats groupBy',
          1 // 1 retry for connection errors
        ),

        // Recent revenue (last 7 days)
        this.withTimeout(
          () =>
            revenueReportService.getReports(
              new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
              new Date()
            ),
          20000, // 20 seconds timeout (this might be slower)
          'Recent revenue reports',
          1 // 1 retry for connection errors
        ),

        // Top plans by subscription count
        this.withTimeout(
          () =>
            prisma.subscription.groupBy({
              by: ['plan_id'],
              where: {
                status: 'ACTIVE',
              },
              _count: { id: true },
              orderBy: {
                _count: {
                  id: 'desc',
                },
              },
              take: 5,
            }),
          10000, // 10 seconds timeout
          'Top plans groupBy',
          1 // 1 retry for connection errors
        ),
      ]);

      // Extract results, handling failures gracefully
      const totalRevenue =
        results[0].status === 'fulfilled'
          ? results[0].value
          : { _sum: { amount: null }, _count: { id: 0 } };
      const activeSubscriptions = results[1].status === 'fulfilled' ? results[1].value : 0;
      const totalMembers = results[2].status === 'fulfilled' ? results[2].value : [];
      const revenueByType = results[3].status === 'fulfilled' ? results[3].value : [];
      const paymentStats = results[4].status === 'fulfilled' ? results[4].value : [];
      const recentRevenue =
        results[5].status === 'fulfilled' ? results[5].value : { success: false, reports: [] };
      const topPlans = results[6].status === 'fulfilled' ? results[6].value : [];

      // Log any failures for debugging with more context
      const queryNames = [
        'Total revenue aggregate',
        'Active subscriptions count',
        'Total members groupBy',
        'Revenue by type groupBy',
        'Payment stats groupBy',
        'Recent revenue reports',
        'Top plans groupBy',
      ];

      results.forEach((result, index) => {
        if (result.status === 'rejected') {
          const error = result.reason;
          const isTimeout =
            error?.message?.includes('timeout') || error?.message?.includes('timed out');
          const isConnectionError =
            error?.code === 'P1001' || error?.message?.includes("Can't reach database server");

          if (isTimeout) {
            console.warn(
              `[WARNING] Query ${index} (${queryNames[index]}) timed out:`,
              error?.message
            );
          } else if (isConnectionError) {
            console.warn(
              `[WARNING] Query ${index} (${queryNames[index]}) connection failed:`,
              error?.message
            );
          } else {
            console.warn(
              `[WARNING] Query ${index} (${queryNames[index]}) failed:`,
              error?.message || error
            );
          }
        }
      });

      // Get plan names for top plans
      const planIds = topPlans.map(p => p.plan_id);
      const plans = await prisma.membershipPlan.findMany({
        where: { id: { in: planIds } },
        select: {
          id: true,
          name: true,
          type: true,
          price: true,
        },
      });

      const planMap = {};
      plans.forEach(plan => {
        planMap[plan.id] = plan;
      });

      res.json({
        success: true,
        message: 'Dashboard analytics retrieved successfully',
        data: {
          dashboard: {
            totalRevenue: Number(totalRevenue._sum.amount || 0),
            totalTransactions: totalRevenue._count.id,
            activeSubscriptions,
            newMembers: totalMembers.length,
            revenueByType: revenueByType.map(item => ({
              type: item.payment_type, // Map payment_type to type for frontend compatibility
              amount: Number(item._sum.amount || 0),
              count: item._count.id,
            })),
            paymentStats: paymentStats.map(item => ({
              status: item.status,
              count: item._count.id,
            })),
            recentRevenue: recentRevenue.success ? recentRevenue.reports : [],
            topPlans: topPlans.map(item => ({
              plan: planMap[item.plan_id] || null,
              subscriptionCount: item._count.id,
            })),
            period: parseInt(period),
          },
        },
      });
    } catch (error) {
      return this.handleDatabaseError(error, res, 'Get dashboard analytics');
    }
  }

  /**
   * Get revenue reports
   */
  async getRevenueReports(req, res) {
    try {
      // Support both 'from'/'to' (frontend) and 'startDate'/'endDate' (backward compatibility)
      const { from, to, startDate, endDate, period = '30' } = req.query;

      let start, end;
      if (from && to) {
        // Frontend sends 'from' and 'to'
        start = new Date(from);
        end = new Date(to);
        
        // Validate dates
        if (isNaN(start.getTime()) || isNaN(end.getTime())) {
          return res.status(400).json({
            success: false,
            message: 'Invalid date format. Use ISO format (YYYY-MM-DD)',
            data: null,
          });
        }

        // Prevent future dates - cap to today
        const today = new Date();
        today.setHours(23, 59, 59, 999);
        if (end > today) {
          end = today;
        }
        if (start > today) {
          start = today;
          start.setHours(0, 0, 0, 0);
        }

        // Set to start/end of day
        start.setHours(0, 0, 0, 0);
        end.setHours(23, 59, 59, 999);
      } else if (startDate && endDate) {
        // Backward compatibility
        start = new Date(startDate);
        end = new Date(endDate);
        
        // Validate dates
        if (isNaN(start.getTime()) || isNaN(end.getTime())) {
          return res.status(400).json({
            success: false,
            message: 'Invalid date format. Use ISO format (YYYY-MM-DD)',
            data: null,
          });
        }

        // Prevent future dates
        const today = new Date();
        today.setHours(23, 59, 59, 999);
        if (end > today) {
          end = today;
        }
        if (start > today) {
          start = today;
          start.setHours(0, 0, 0, 0);
        }
      } else {
        end = new Date();
        start = new Date();
        start.setDate(start.getDate() - parseInt(period));
        start.setHours(0, 0, 0, 0);
        end.setHours(23, 59, 59, 999);
      }

      // Calculate revenue directly from payments (more accurate than relying on revenue reports)
      // Include all successful payment statuses, including REFUNDED and PARTIALLY_REFUNDED
      // because refunds will be subtracted separately later
      // Wrap with timeout to handle slow queries gracefully
      let payments;
      try {
        payments = await this.withTimeout(
          () =>
            prisma.payment.findMany({
              where: {
                created_at: {
                  gte: start,
                  lte: end,
                },
                status: {
                  in: ['COMPLETED', 'REFUNDED', 'PARTIALLY_REFUNDED'],
                },
              },
              select: {
                amount: true,
                created_at: true,
                status: true,
              },
            }),
          20000, // 20 seconds timeout
          'Get revenue reports payments',
          1 // 1 retry for connection errors
        );
      } catch (error) {
        // If query times out or fails, return empty result instead of failing completely
        console.warn('[WARNING] Failed to fetch payments for revenue reports:', error.message);
        payments = [];
      }

      // Calculate totals
      // Include all payments (even refunded ones) because refunds will be subtracted separately
      const total_revenue = payments.reduce((sum, payment) => sum + parseFloat(payment.amount || 0), 0);
      const total_transactions = payments.length;
      const average_revenue = total_transactions > 0 ? total_revenue / total_transactions : 0;

      // Also try to get from revenue reports if available (for additional context)
      // Wrap with timeout and catch errors gracefully
      const result = await this.withTimeout(
        () => revenueReportService.getReports(start, end),
        15000, // 15 seconds timeout
        'Get revenue reports service',
        1 // 1 retry for connection errors
      ).catch((error) => {
        console.warn('[WARNING] Revenue report service failed:', error.message);
        return { success: false };
      });

      res.json({
        success: true,
        message: 'Revenue reports retrieved successfully',
        data: {
          total_revenue,
          average_revenue,
          total_transactions,
          // Include revenue report data if available
          ...(result.success ? { reports: result.reports, totals: result.totals } : {}),
        },
      });
    } catch (error) {
      return this.handleDatabaseError(error, res, 'Get revenue reports');
    }
  }

  /**
   * Generate revenue report for a specific date
   */
  async generateRevenueReport(req, res) {
    try {
      const { date } = req.body;

      if (!date) {
        return res.status(400).json({
          success: false,
          message: 'Date is required',
          data: null,
        });
      }

      const result = await revenueReportService.generateDailyReport(new Date(date));

      if (!result.success) {
        return res.status(500).json({
          success: false,
          message: result.error,
          data: null,
        });
      }

      res.json({
        success: true,
        message: result.isNew
          ? 'Revenue report generated successfully'
          : 'Revenue report updated successfully',
        data: { report: result.report },
      });
    } catch (error) {
      console.error('Generate revenue report error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        data: null,
      });
    }
  }

  /**
   * Get revenue forecast
   */
  async getRevenueForecast(req, res) {
    try {
      const { days = 30 } = req.query;

      const result = await revenueReportService.forecastRevenue(parseInt(days));

      if (!result.success) {
        return res.status(500).json({
          success: false,
          message: result.error,
          data: null,
        });
      }

      res.json({
        success: true,
        message: 'Revenue forecast retrieved successfully',
        data: result,
      });
    } catch (error) {
      console.error('Get revenue forecast error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        data: null,
      });
    }
  }

  /**
   * Get member lifetime value
   */
  async getMemberLTV(req, res) {
    try {
      const { memberId } = req.params;

      const result = await memberAnalyticsService.calculateLTV(memberId);

      if (!result.success) {
        return res.status(500).json({
          success: false,
          message: result.error,
          data: null,
        });
      }

      res.json({
        success: true,
        message: 'Member LTV calculated successfully',
        data: result.ltv,
      });
    } catch (error) {
      console.error('Get member LTV error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        data: null,
      });
    }
  }

  /**
   * Update member LTV
   */
  async updateMemberLTV(req, res) {
    try {
      const { memberId } = req.params;

      const result = await memberAnalyticsService.updateMemberLTV(memberId);

      if (!result.success) {
        return res.status(500).json({
          success: false,
          message: result.error,
          data: null,
        });
      }

      res.json({
        success: true,
        message: 'Member LTV updated successfully',
        data: { ltv: result.ltv },
      });
    } catch (error) {
      console.error('Update member LTV error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        data: null,
      });
    }
  }

  /**
   * Get members at risk of churning
   */
  async getAtRiskMembers(req, res) {
    try {
      const { limit = 50 } = req.query;

      const result = await memberAnalyticsService.getAtRiskMembers(parseInt(limit));

      if (!result.success) {
        return res.status(500).json({
          success: false,
          message: result.error,
          data: null,
        });
      }

      res.json({
        success: true,
        message: 'At-risk members retrieved successfully',
        data: result,
      });
    } catch (error) {
      console.error('Get at-risk members error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        data: null,
      });
    }
  }

  /**
   * Get top members by LTV
   */
  async getTopMembersByLTV(req, res) {
    try {
      const { limit = 50 } = req.query;

      const result = await memberAnalyticsService.getTopMembersByLTV(parseInt(limit));

      if (!result.success) {
        return res.status(500).json({
          success: false,
          message: result.error,
          data: null,
        });
      }

      res.json({
        success: true,
        message: 'Top members by LTV retrieved successfully',
        data: result,
      });
    } catch (error) {
      console.error('Get top members by LTV error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        data: null,
      });
    }
  }

  /**
   * Export revenue report to PDF
   */
  async exportRevenueReportPDF(req, res) {
    try {
      const { startDate, endDate, period = '30' } = req.query;

      let start, end;
      if (startDate && endDate) {
        start = new Date(startDate);
        end = new Date(endDate);
      } else {
        end = new Date();
        start = new Date();
        start.setDate(start.getDate() - parseInt(period));
      }

      const result = await revenueReportService.getReports(start, end);

      if (!result.success) {
        return res.status(500).json({
          success: false,
          message: result.error,
          data: null,
        });
      }

      const pdfBuffer = await reportExportService.exportRevenueReportToPDF(result);

      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader(
        'Content-Disposition',
        `attachment; filename="revenue-report-${start.toISOString().split('T')[0]}-${
          end.toISOString().split('T')[0]
        }.pdf"`
      );
      res.send(pdfBuffer);
    } catch (error) {
      console.error('Export revenue report PDF error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        data: null,
      });
    }
  }

  /**
   * Export revenue report to Excel
   */
  async exportRevenueReportExcel(req, res) {
    try {
      const { startDate, endDate, period = '30' } = req.query;

      let start, end;
      if (startDate && endDate) {
        start = new Date(startDate);
        end = new Date(endDate);
      } else {
        end = new Date();
        start = new Date();
        start.setDate(start.getDate() - parseInt(period));
      }

      const result = await revenueReportService.getReports(start, end);

      if (!result.success) {
        return res.status(500).json({
          success: false,
          message: result.error,
          data: null,
        });
      }

      const excelBuffer = await reportExportService.exportRevenueReportToExcel(result);

      res.setHeader(
        'Content-Type',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      );
      res.setHeader(
        'Content-Disposition',
        `attachment; filename="revenue-report-${start.toISOString().split('T')[0]}-${
          end.toISOString().split('T')[0]
        }.xlsx"`
      );
      res.send(excelBuffer);
    } catch (error) {
      console.error('Export revenue report Excel error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        data: null,
      });
    }
  }

  /**
   * Get revenue trends over time
   */
  async getRevenueTrends(req, res) {
    try {
      console.log('[STATS] Getting revenue trends...', { query: req.query });
      const { from, to } = req.query;

      let startDate, endDate;
      if (from && to) {
        startDate = new Date(from);
        endDate = new Date(to);

        // Validate dates
        if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
          console.error('[ERROR] Invalid date format:', { from, to });
          return res.status(400).json({
            success: false,
            message: 'Invalid date format. Use ISO format (YYYY-MM-DD)',
            data: null,
          });
        }
      } else {
        // Default to last 30 days
        endDate = new Date();
        startDate = new Date();
        startDate.setDate(startDate.getDate() - 30);
      }

      // Ensure endDate is at end of day
      endDate.setHours(23, 59, 59, 999);
      startDate.setHours(0, 0, 0, 0);

      console.log('[DATE] Date range:', { startDate, endDate });

      // Get daily revenue data
      // Only include COMPLETED payments (gross revenue before refunds)
      // Note: Refunds are NOT subtracted here - they are only subtracted in "Doanh thu sau chi phí" section
      // This ensures "Tổng doanh thu" shows gross revenue (before refunds)
      // Refunds will be subtracted separately in the net revenue calculation
      // Limit to prevent loading too much data for large date ranges
      // For analytics, we can use aggregation instead of loading all records
      const payments = await prisma.payment.findMany({
        where: {
          status: 'COMPLETED', // Only count completed payments (gross revenue)
          created_at: {
            gte: startDate,
            lte: endDate,
          },
        },
        select: {
          amount: true,
          created_at: true,
        },
        orderBy: {
          created_at: 'asc',
        },
        take: 10000, // Max 10k records for trend analysis
      });

      console.log(`[STATS] Found ${payments.length} payments`);

      // Group payments by date
      const revenueByDate = {};
      payments.forEach(payment => {
        const dateKey = payment.created_at.toISOString().split('T')[0];
        if (!revenueByDate[dateKey]) {
          revenueByDate[dateKey] = {
            revenue: 0,
            transactions: 0,
          };
        }
        revenueByDate[dateKey].revenue += Number(payment.amount) || 0;
        revenueByDate[dateKey].transactions += 1;
      });

      // Fill in missing dates with zero values
      const allDates = [];
      const currentDate = new Date(startDate);
      while (currentDate <= endDate) {
        const dateKey = currentDate.toISOString().split('T')[0];
        allDates.push(dateKey);
        if (!revenueByDate[dateKey]) {
          revenueByDate[dateKey] = {
            revenue: 0,
            transactions: 0,
          };
        }
        currentDate.setDate(currentDate.getDate() + 1);
      }

      // Convert to arrays sorted by date
      const dates = allDates.sort();
      const revenues = dates.map(date => revenueByDate[date].revenue);
      const transactions = dates.map(date => revenueByDate[date].transactions);

      console.log('[SUCCESS] Revenue trends generated:', { datesCount: dates.length });

      res.json({
        success: true,
        message: 'Revenue trends retrieved successfully',
        data: {
          dates,
          revenues,
          transactions,
        },
      });
    } catch (error) {
      return this.handleDatabaseError(error, res, 'Get revenue trends');
    }
  }

  /**
   * Get revenue by plan
   */
  async getRevenueByPlan(req, res) {
    try {
      console.log('[STATS] Getting revenue by plan...', { query: req.query });
      const { from, to, period = '30' } = req.query;

      let startDate, endDate;
      if (from && to) {
        startDate = new Date(from);
        endDate = new Date(to);

        // Validate dates
        if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
          console.error('[ERROR] Invalid date format:', { from, to });
          return res.status(400).json({
            success: false,
            message: 'Invalid date format. Use ISO format (YYYY-MM-DD)',
            data: null,
          });
        }
      } else {
        // Default to last N days based on period
        endDate = new Date();
        startDate = new Date();
        startDate.setDate(startDate.getDate() - parseInt(period));
      }

      // Ensure endDate is at end of day
      endDate.setHours(23, 59, 59, 999);
      startDate.setHours(0, 0, 0, 0);

      console.log('[DATE] Date range:', { startDate, endDate });

      // Get payments with subscription and plan information
      // Include all successful payment statuses, including REFUNDED and PARTIALLY_REFUNDED
      // because refunds will be subtracted separately later
      // Wrap with timeout to handle slow queries gracefully
      let payments;
      try {
        payments = await this.withTimeout(
          () =>
            prisma.payment.findMany({
              where: {
                status: {
                  in: ['COMPLETED', 'REFUNDED', 'PARTIALLY_REFUNDED'],
                },
                created_at: {
                  gte: startDate,
                  lte: endDate,
                },
                subscription_id: {
                  not: null, // Only subscription payments
                },
              },
              include: {
                subscription: {
                  include: {
                    plan: {
                      select: {
                        id: true,
                        name: true,
                        price: true,
                      },
                    },
                  },
                },
              },
              orderBy: {
                created_at: 'desc',
              },
              take: 5000, // Limit to prevent loading too much data
            }),
          20000, // 20 seconds timeout for complex query with joins
          'Get revenue by plan payments',
          1 // 1 retry for connection errors
        );
      } catch (error) {
        // If query times out or fails, return empty result instead of failing completely
        console.warn('[WARNING] Failed to fetch payments for revenue by plan:', error.message);
        payments = [];
      }

      console.log(`[STATS] Found ${payments.length} subscription payments`);

      // If no payments (due to timeout or empty result), return empty response
      if (!payments || payments.length === 0) {
        return res.json({
          success: true,
          message: 'Revenue by plan retrieved successfully',
          data: {
            plans: [],
            totalRevenue: 0,
            totalTransactions: 0,
          },
        });
      }

      // Group by plan
      const revenueByPlan = {};
      payments.forEach(payment => {
        if (!payment.subscription || !payment.subscription.plan) {
          return; // Skip if no plan info
        }

        const planId = payment.subscription.plan.id;
        const planName = payment.subscription.plan.name;

        if (!revenueByPlan[planId]) {
          revenueByPlan[planId] = {
            planId,
            planName,
            revenue: 0,
            transactions: 0,
          };
        }

        revenueByPlan[planId].revenue += Number(payment.amount) || 0;
        revenueByPlan[planId].transactions += 1;
      });

      // Convert to array and sort by revenue (descending)
      const plans = Object.values(revenueByPlan)
        .sort((a, b) => b.revenue - a.revenue)
        .map(item => ({
          planId: item.planId,
          planName: item.planName,
          revenue: Number(item.revenue),
          transactions: item.transactions,
        }));

      console.log('[SUCCESS] Revenue by plan generated:', { plansCount: plans.length });

      res.json({
        success: true,
        message: 'Revenue by plan retrieved successfully',
        data: {
          plans,
          totalRevenue: plans.reduce((sum, p) => sum + p.revenue, 0),
          totalTransactions: plans.reduce((sum, p) => sum + p.transactions, 0),
        },
      });
    } catch (error) {
      return this.handleDatabaseError(error, res, 'Get revenue by plan');
    }
  }

  /**
   * Export member analytics to Excel
   */
  async exportMemberAnalyticsExcel(req, res) {
    try {
      const { type = 'at-risk', limit = 100 } = req.query;

      let members;
      if (type === 'at-risk') {
        const result = await memberAnalyticsService.getAtRiskMembers(parseInt(limit));
        if (!result.success) {
          return res.status(500).json({
            success: false,
            message: result.error,
            data: null,
          });
        }
        members = result.members;
      } else if (type === 'top-ltv') {
        const result = await memberAnalyticsService.getTopMembersByLTV(parseInt(limit));
        if (!result.success) {
          return res.status(500).json({
            success: false,
            message: result.error,
            data: null,
          });
        }
        members = result.members;
      } else {
        return res.status(400).json({
          success: false,
          message: 'Invalid type. Must be "at-risk" or "top-ltv"',
          data: null,
        });
      }

      const excelBuffer = await reportExportService.exportMemberAnalyticsToExcel(members);

      res.setHeader(
        'Content-Type',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      );
      res.setHeader(
        'Content-Disposition',
        `attachment; filename="member-analytics-${type}-${
          new Date().toISOString().split('T')[0]
        }.xlsx"`
      );
      res.send(excelBuffer);
    } catch (error) {
      console.error('Export member analytics Excel error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        data: null,
      });
    }
  }
}

module.exports = new AnalyticsController();
