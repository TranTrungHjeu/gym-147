const { prisma } = require('../lib/prisma.js');

/**
 * Member Analytics Service
 * Handles member lifetime value (LTV) and churn prediction
 */
class MemberAnalyticsService {
  /**
   * Calculate member lifetime value
   * @param {string} memberId - Member ID
   * @returns {Promise<Object>} LTV calculation
   */
  async calculateLTV(memberId) {
    try {
      // Get all payments for this member
      const payments = await prisma.payment.findMany({
        where: {
          member_id: memberId,
          status: 'SUCCESS',
        },
        select: {
          amount: true,
          created_at: true,
          type: true,
        },
        orderBy: {
          created_at: 'asc',
        },
      });

      // Calculate total spent
      const totalSpent = payments.reduce((sum, payment) => sum + Number(payment.amount), 0);

      // Get subscription info
      const subscription = await prisma.subscription.findFirst({
        where: {
          member_id: memberId,
          status: 'ACTIVE',
        },
        include: {
          plan: true,
        },
        orderBy: {
          created_at: 'desc',
        },
      });

      // Calculate membership duration
      const firstPayment = payments[0];
      const membershipDuration = firstPayment
        ? Math.ceil((new Date() - new Date(firstPayment.created_at)) / (1000 * 60 * 60 * 24))
        : 0; // days

      // Calculate monthly average
      const monthlyAverage = membershipDuration > 0
        ? (totalSpent / membershipDuration) * 30
        : 0;

      // Predict LTV based on average monthly spending and expected retention
      // Simple model: monthly average * expected months (default 12 months)
      const expectedMonths = 12;
      const predictedLTV = monthlyAverage * expectedMonths;

      // Calculate engagement score (0-100)
      const engagementScore = this.calculateEngagementScore(memberId, payments, subscription);

      // Calculate churn risk (0-100, higher = more risk)
      const churnRisk = await this.calculateChurnRisk(memberId, subscription, payments);

      return {
        success: true,
        ltv: {
          total_spent: totalSpent,
          monthly_average: monthlyAverage,
          predicted_ltv: predictedLTV,
          membership_duration_days: membershipDuration,
          engagement_score: engagementScore,
          churn_risk_score: churnRisk,
        },
      };
    } catch (error) {
      console.error('Calculate LTV error:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Calculate engagement score
   * @param {string} memberId - Member ID
   * @param {Array} payments - Payment history
   * @param {Object} subscription - Current subscription
   * @returns {number} Engagement score (0-100)
   */
  calculateEngagementScore(memberId, payments, subscription) {
    try {
      let score = 0;

      // Payment frequency (max 30 points)
      const paymentFrequency = payments.length;
      score += Math.min(30, paymentFrequency * 5);

      // Subscription status (max 20 points)
      if (subscription && subscription.status === 'ACTIVE') {
        score += 20;
      }

      // Recent activity (max 30 points)
      const recentPayments = payments.filter(
        p => new Date(p.created_at) > new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
      ).length;
      score += Math.min(30, recentPayments * 10);

      // Subscription duration (max 20 points)
      if (subscription) {
        const duration = Math.ceil(
          (new Date() - new Date(subscription.created_at)) / (1000 * 60 * 60 * 24)
        );
        score += Math.min(20, duration / 10);
      }

      return Math.min(100, Math.round(score));
    } catch (error) {
      console.error('Calculate engagement score error:', error);
      return 50; // Default score
    }
  }

  /**
   * Calculate churn risk
   * @param {string} memberId - Member ID
   * @param {Object} subscription - Current subscription
   * @param {Array} payments - Payment history
   * @returns {Promise<number>} Churn risk score (0-100)
   */
  async calculateChurnRisk(memberId, subscription, payments) {
    try {
      let risk = 0;

      // No active subscription (max 50 points)
      if (!subscription || subscription.status !== 'ACTIVE') {
        risk += 50;
      }

      // Payment issues (max 30 points)
      const recentFailedPayments = await prisma.payment.count({
        where: {
          member_id: memberId,
          status: 'FAILED',
          created_at: {
            gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
          },
        },
      });
      risk += Math.min(30, recentFailedPayments * 10);

      // Low engagement (max 20 points)
      const recentPayments = payments.filter(
        p => new Date(p.created_at) > new Date(Date.now() - 60 * 24 * 60 * 60 * 1000)
      ).length;
      if (recentPayments === 0 && payments.length > 0) {
        risk += 20;
      }

      return Math.min(100, Math.round(risk));
    } catch (error) {
      console.error('Calculate churn risk error:', error);
      return 50; // Default risk
    }
  }

  /**
   * Update member LTV record
   * @param {string} memberId - Member ID
   * @returns {Promise<Object>} Updated LTV
   */
  async updateMemberLTV(memberId) {
    try {
      const ltvResult = await this.calculateLTV(memberId);

      if (!ltvResult.success) {
        return ltvResult;
      }

      const { ltv } = ltvResult;

      // Update or create LTV record
      const existingLTV = await prisma.memberLifetimeValue.findUnique({
        where: { member_id: memberId },
      });

      const ltvData = {
        total_spent: ltv.total_spent,
        predicted_ltv: ltv.predicted_ltv,
        engagement_score: ltv.engagement_score,
        churn_risk_score: ltv.churn_risk_score,
        last_calculated_at: new Date(),
      };

      if (existingLTV) {
        const updated = await prisma.memberLifetimeValue.update({
          where: { member_id: memberId },
          data: ltvData,
        });
        return { success: true, ltv: updated };
      } else {
        const created = await prisma.memberLifetimeValue.create({
          data: {
            member_id: memberId,
            ...ltvData,
          },
        });
        return { success: true, ltv: created };
      }
    } catch (error) {
      console.error('Update member LTV error:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Get members at risk of churning
   * @param {number} limit - Number of members to return
   * @returns {Promise<Object>} At-risk members
   */
  async getAtRiskMembers(limit = 50) {
    try {
      const atRiskMembers = await prisma.memberLifetimeValue.findMany({
        where: {
          churn_risk_score: {
            gte: 50, // High risk threshold
          },
        },
        orderBy: {
          churn_risk_score: 'desc',
        },
        take: limit,
      });

      return {
        success: true,
        members: atRiskMembers,
        count: atRiskMembers.length,
      };
    } catch (error) {
      console.error('Get at-risk members error:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Get top members by LTV
   * @param {number} limit - Number of members to return
   * @returns {Promise<Object>} Top members
   */
  async getTopMembersByLTV(limit = 50) {
    try {
      const topMembers = await prisma.memberLifetimeValue.findMany({
        orderBy: {
          predicted_ltv: 'desc',
        },
        take: limit,
      });

      return {
        success: true,
        members: topMembers,
        count: topMembers.length,
      };
    } catch (error) {
      console.error('Get top members by LTV error:', error);
      return { success: false, error: error.message };
    }
  }
}

module.exports = new MemberAnalyticsService();

