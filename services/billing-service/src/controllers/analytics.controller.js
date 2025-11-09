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
   * Get dashboard analytics for admin
   */
  async getDashboardAnalytics(req, res) {
    try {
      const { period = '30' } = req.query;
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - parseInt(period));

      const [
        totalRevenue,
        activeSubscriptions,
        totalMembers,
        revenueByType,
        paymentStats,
        recentRevenue,
        topPlans,
      ] = await Promise.all([
        // Total revenue
        prisma.payment.aggregate({
          where: {
            status: 'COMPLETED', // PaymentStatus enum: COMPLETED, not SUCCESS
            created_at: { gte: startDate },
          },
          _sum: { amount: true },
          _count: { id: true },
        }),

        // Active subscriptions
        prisma.subscription.count({
          where: { status: 'ACTIVE' },
        }),

        // Total members with subscriptions
        prisma.subscription.groupBy({
          by: ['member_id'],
          where: {
            created_at: { gte: startDate },
          },
        }),

        // Revenue by type
        prisma.payment.groupBy({
          by: ['type'],
          where: {
            status: 'COMPLETED', // PaymentStatus enum: COMPLETED, not SUCCESS
            created_at: { gte: startDate },
          },
          _sum: { amount: true },
          _count: { id: true },
        }),

        // Payment stats
        prisma.payment.groupBy({
          by: ['status'],
          where: {
            created_at: { gte: startDate },
          },
          _count: { id: true },
        }),

        // Recent revenue (last 7 days)
        revenueReportService.getReports(
          new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
          new Date()
        ),

        // Top plans by subscription count
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
      ]);

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
              type: item.type,
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
      console.error('Get dashboard analytics error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        data: null,
      });
    }
  }

  /**
   * Get revenue reports
   */
  async getRevenueReports(req, res) {
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

      res.json({
        success: true,
        message: 'Revenue reports retrieved successfully',
        data: result,
      });
    } catch (error) {
      console.error('Get revenue reports error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        data: null,
      });
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
        message: result.isNew ? 'Revenue report generated successfully' : 'Revenue report updated successfully',
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
        `attachment; filename="revenue-report-${start.toISOString().split('T')[0]}-${end.toISOString().split('T')[0]}.pdf"`
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

      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader(
        'Content-Disposition',
        `attachment; filename="revenue-report-${start.toISOString().split('T')[0]}-${end.toISOString().split('T')[0]}.xlsx"`
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
      console.log('📊 Getting revenue trends...', { query: req.query });
      const { from, to } = req.query;

      let startDate, endDate;
      if (from && to) {
        startDate = new Date(from);
        endDate = new Date(to);
        
        // Validate dates
        if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
          console.error('❌ Invalid date format:', { from, to });
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

      console.log('📅 Date range:', { startDate, endDate });

      // Get daily revenue data
      const payments = await prisma.payment.findMany({
        where: {
          status: 'COMPLETED', // PaymentStatus enum: PENDING, PROCESSING, COMPLETED, FAILED, CANCELLED, REFUNDED, PARTIALLY_REFUNDED
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
      });

      console.log(`📊 Found ${payments.length} payments`);

      // Group by date
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

      console.log('✅ Revenue trends generated:', { datesCount: dates.length });

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
      console.error('❌ Get revenue trends error:', error);
      console.error('Error stack:', error.stack);
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        data: null,
        error: process.env.NODE_ENV === 'development' ? error.message : undefined,
      });
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

      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader(
        'Content-Disposition',
        `attachment; filename="member-analytics-${type}-${new Date().toISOString().split('T')[0]}.xlsx"`
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

