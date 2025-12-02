const { prisma } = require('../lib/prisma.js');

/**
 * Revenue Report Service
 * Handles revenue report generation and forecasting
 */
class RevenueReportService {
  /**
   * Generate revenue report for a specific date
   * @param {Date} date - Report date
   * @returns {Promise<Object>} Revenue report
   */
  async generateDailyReport(date) {
    try {
      const startOfDay = new Date(date);
      startOfDay.setHours(0, 0, 0, 0);
      const endOfDay = new Date(date);
      endOfDay.setHours(23, 59, 59, 999);

      // Get all payments for the day
      const payments = await prisma.payment.findMany({
        where: {
          created_at: {
            gte: startOfDay,
            lte: endOfDay,
          },
          status: 'SUCCESS',
        },
        include: {
          subscription: {
            include: {
              plan: true,
            },
          },
        },
      });

      // Calculate revenue by type
      let subscription_revenue = 0;
      let class_revenue = 0;
      let addon_revenue = 0;
      let other_revenue = 0;

      payments.forEach(payment => {
        const amount = Number(payment.amount);
        
        if (payment.subscription_id) {
          // Subscription payment
          subscription_revenue += amount;
        } else if (payment.type === 'CLASS_BOOKING') {
          // Class booking payment
          class_revenue += amount;
        } else if (payment.type === 'ADDON') {
          // Addon payment
          addon_revenue += amount;
        } else {
          // Other payments
          other_revenue += amount;
        }
      });

      const total_revenue = subscription_revenue + class_revenue + addon_revenue + other_revenue;

      // Get membership metrics
      const newMembers = await prisma.subscription.count({
        where: {
          created_at: {
            gte: startOfDay,
            lte: endOfDay,
          },
          status: 'ACTIVE',
        },
      });

      const cancelledMembers = await prisma.subscription.count({
        where: {
          status: 'CANCELLED',
          updated_at: {
            gte: startOfDay,
            lte: endOfDay,
          },
        },
      });

      const activeMembers = await prisma.subscription.count({
        where: {
          status: 'ACTIVE',
        },
      });

      // Payment metrics
      const successful_payments = await prisma.payment.count({
        where: {
          created_at: {
            gte: startOfDay,
            lte: endOfDay,
          },
          status: 'SUCCESS',
        },
      });

      const failed_payments = await prisma.payment.count({
        where: {
          created_at: {
            gte: startOfDay,
            lte: endOfDay,
          },
          status: 'FAILED',
        },
      });

      const refunds = await prisma.refund.findMany({
        where: {
          created_at: {
            gte: startOfDay,
            lte: endOfDay,
          },
        },
      });

      const refunds_issued = refunds.length;
      const refunds_amount = refunds.reduce((sum, refund) => sum + Number(refund.amount), 0);

      // Check if report already exists
      const existingReport = await prisma.revenueReport.findUnique({
        where: { report_date: startOfDay },
      });

      const reportData = {
        report_date: startOfDay,
        subscription_revenue,
        class_revenue,
        addon_revenue,
        other_revenue,
        total_revenue,
        new_members: newMembers,
        cancelled_members: cancelledMembers,
        active_members: activeMembers,
        successful_payments,
        failed_payments,
        refunds_issued,
        refunds_amount,
      };

      if (existingReport) {
        // Update existing report
        const updated = await prisma.revenueReport.update({
          where: { id: existingReport.id },
          data: reportData,
        });
        return { success: true, report: updated, isNew: false };
      } else {
        // Create new report
        const created = await prisma.revenueReport.create({
          data: reportData,
        });
        return { success: true, report: created, isNew: true };
      }
    } catch (error) {
      console.error('Generate daily report error:', error);
      
      // Handle database connection errors (P1001: Can't reach database server)
      if (error.code === 'P1001' || error.message?.includes('Can\'t reach database server')) {
        console.error('[ERROR] Database connection failed in RevenueReportService:', error.message);
        return {
          success: false,
          error: 'DATABASE_CONNECTION_ERROR',
          message: 'Database service temporarily unavailable',
        };
      }
      
      // Handle timeout errors
      if (error.code === 'P1008' || error.code === 'P1014' || 
          error.message?.includes('timeout') || 
          error.message?.includes('timed out')) {
        console.error('[ERROR] Database operation timed out in RevenueReportService:', error.message);
        return {
          success: false,
          error: 'DATABASE_TIMEOUT_ERROR',
          message: 'Database operation timed out',
        };
      }
      
      // Handle other Prisma errors
      if (error.code?.startsWith('P')) {
        console.error('[ERROR] Prisma error in RevenueReportService:', error.code, error.message);
        return {
          success: false,
          error: 'DATABASE_ERROR',
          message: 'Database query failed',
        };
      }
      
      return {
        success: false,
        error: 'INTERNAL_ERROR',
        message: error.message || 'Failed to generate daily report',
      };
    }
  }

  /**
   * Get revenue reports for a date range
   * @param {Date} startDate - Start date
   * @param {Date} endDate - End date
   * @returns {Promise<Object>} Revenue reports
   */
  async getReports(startDate, endDate) {
    try {
      const reports = await prisma.revenueReport.findMany({
        where: {
          report_date: {
            gte: startDate,
            lte: endDate,
          },
        },
        orderBy: {
          report_date: 'asc',
        },
      });

      // Calculate totals
      const totals = reports.reduce(
        (acc, report) => ({
          subscription_revenue: acc.subscription_revenue + Number(report.subscription_revenue),
          class_revenue: acc.class_revenue + Number(report.class_revenue),
          addon_revenue: acc.addon_revenue + Number(report.addon_revenue),
          other_revenue: acc.other_revenue + Number(report.other_revenue),
          total_revenue: acc.total_revenue + Number(report.total_revenue),
          new_members: acc.new_members + report.new_members,
          cancelled_members: acc.cancelled_members + report.cancelled_members,
          successful_payments: acc.successful_payments + report.successful_payments,
          failed_payments: acc.failed_payments + report.failed_payments,
          refunds_issued: acc.refunds_issued + report.refunds_issued,
          refunds_amount: acc.refunds_amount + Number(report.refunds_amount),
        }),
        {
          subscription_revenue: 0,
          class_revenue: 0,
          addon_revenue: 0,
          other_revenue: 0,
          total_revenue: 0,
          new_members: 0,
          cancelled_members: 0,
          successful_payments: 0,
          failed_payments: 0,
          refunds_issued: 0,
          refunds_amount: 0,
        }
      );

      return {
        success: true,
        reports,
        totals,
        period: {
          startDate,
          endDate,
          days: Math.ceil((endDate - startDate) / (1000 * 60 * 60 * 24)),
        },
      };
    } catch (error) {
      console.error('Get reports error:', error);
      
      // Handle database connection errors
      if (error.code === 'P1001' || error.message?.includes('Can\'t reach database server')) {
        console.error('[ERROR] Database connection failed in RevenueReportService:', error.message);
        return {
          success: false,
          error: 'DATABASE_CONNECTION_ERROR',
          message: 'Database service temporarily unavailable',
        };
      }
      
      // Handle other Prisma errors
      if (error.code?.startsWith('P')) {
        console.error('[ERROR] Prisma error in RevenueReportService:', error.code, error.message);
        return {
          success: false,
          error: 'DATABASE_ERROR',
          message: 'Database query failed',
        };
      }
      
      return {
        success: false,
        error: 'INTERNAL_ERROR',
        message: error.message || 'Failed to get reports',
      };
    }
  }

  /**
   * Forecast revenue for future period
   * @param {number} days - Number of days to forecast
   * @returns {Promise<Object>} Revenue forecast
   */
  async forecastRevenue(days = 30) {
    try {
      // Get last 30 days of reports
      const endDate = new Date();
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - 30);

      const reports = await prisma.revenueReport.findMany({
        where: {
          report_date: {
            gte: startDate,
            lte: endDate,
          },
        },
        orderBy: {
          report_date: 'asc',
        },
      });

      if (reports.length === 0) {
        return {
          success: false,
          error: 'Insufficient historical data for forecasting',
        };
      }

      // Calculate daily average
      const dailyAvg = reports.reduce(
        (sum, report) => sum + Number(report.total_revenue),
        0
      ) / reports.length;

      // Calculate growth rate (simple linear regression)
      const growthRate = this.calculateGrowthRate(reports);

      // Forecast
      const forecast = [];
      let currentDate = new Date(endDate);
      currentDate.setDate(currentDate.getDate() + 1);

      for (let i = 0; i < days; i++) {
        const forecastDate = new Date(currentDate);
        forecastDate.setDate(forecastDate.getDate() + i);

        // Simple forecast: average + growth
        const forecastedRevenue = dailyAvg * (1 + growthRate * i / 30);

        forecast.push({
          date: forecastDate,
          forecasted_revenue: Math.max(0, forecastedRevenue),
        });
      }

      const totalForecast = forecast.reduce(
        (sum, item) => sum + item.forecasted_revenue,
        0
      );

      return {
        success: true,
        forecast,
        summary: {
          dailyAverage: dailyAvg,
          growthRate,
          totalForecast,
          period: days,
        },
      };
    } catch (error) {
      console.error('Forecast revenue error:', error);
      
      // Handle database connection errors (P1001: Can't reach database server)
      if (error.code === 'P1001' || error.message?.includes('Can\'t reach database server')) {
        console.error('[ERROR] Database connection failed in RevenueReportService:', error.message);
        return {
          success: false,
          error: 'DATABASE_CONNECTION_ERROR',
          message: 'Database service temporarily unavailable',
        };
      }
      
      // Handle timeout errors
      if (error.code === 'P1008' || error.code === 'P1014' || 
          error.message?.includes('timeout') || 
          error.message?.includes('timed out')) {
        console.error('[ERROR] Database operation timed out in RevenueReportService:', error.message);
        return {
          success: false,
          error: 'DATABASE_TIMEOUT_ERROR',
          message: 'Database operation timed out',
        };
      }
      
      // Handle other Prisma errors
      if (error.code?.startsWith('P')) {
        console.error('[ERROR] Prisma error in RevenueReportService:', error.code, error.message);
        return {
          success: false,
          error: 'DATABASE_ERROR',
          message: 'Database query failed',
        };
      }
      
      return {
        success: false,
        error: 'INTERNAL_ERROR',
        message: error.message || 'Failed to forecast revenue',
      };
    }
  }

  /**
   * Calculate growth rate from reports
   * @param {Array} reports - Historical reports
   * @returns {number} Growth rate
   */
  calculateGrowthRate(reports) {
    if (reports.length < 2) {
      return 0;
    }

    const first = Number(reports[0].total_revenue);
    const last = Number(reports[reports.length - 1].total_revenue);

    if (first === 0) {
      return 0;
    }

    // Simple growth rate calculation
    return (last - first) / first / reports.length;
  }

  /**
   * Generate report for yesterday (auto-called by cron)
   */
  async generateYesterdayReport() {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    return await this.generateDailyReport(yesterday);
  }
}

module.exports = new RevenueReportService();

