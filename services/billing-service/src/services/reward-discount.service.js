/**
 * Reward Discount Service
 * Handles integration with member-service for reward redemption codes
 */

const axios = require('axios');

class RewardDiscountService {
  /**
   * Verify reward redemption code and get discount details
   * @param {string} code - Redemption code
   * @param {string} memberId - Member ID
   * @returns {Promise<Object>} Discount details or error
   */
  async verifyRewardCode(code, memberId) {
    try {
      const memberServiceUrl = process.env.MEMBER_SERVICE_URL || 'http://localhost:3002';

      // Call member-service to verify redemption code
      const response = await axios.post(
        `${memberServiceUrl}/rewards/verify-code`,
        { code },
        {
          headers: {
            'Content-Type': 'application/json',
          },
          timeout: 10000,
        }
      );

      if (!response.data.success) {
        return {
          success: false,
          error: response.data.message || 'Invalid redemption code',
        };
      }

      const redemption = response.data.data;

      // Check if code belongs to this member
      if (redemption.member_id !== memberId) {
        return {
          success: false,
          error: 'This redemption code does not belong to you',
        };
      }

      // Check if redemption is active
      if (redemption.status !== 'ACTIVE') {
        return {
          success: false,
          error: `This redemption code is ${redemption.status.toLowerCase()}`,
        };
      }

      // Check if reward type supports discount
      const reward = redemption.reward;
      if (!reward) {
        return {
          success: false,
          error: 'Reward information not found',
        };
      }

      // Only PERCENTAGE_DISCOUNT and FIXED_AMOUNT_DISCOUNT can be used as discount codes
      const discountTypes = ['PERCENTAGE_DISCOUNT', 'FIXED_AMOUNT_DISCOUNT'];
      if (!discountTypes.includes(reward.reward_type)) {
        return {
          success: false,
          error: 'This reward cannot be used as a discount code',
        };
      }

      // Check expiration
      if (redemption.expires_at && new Date(redemption.expires_at) < new Date()) {
        return {
          success: false,
          error: 'This redemption code has expired',
        };
      }

      // Return discount details
      return {
        success: true,
        discount: {
          type: reward.reward_type === 'PERCENTAGE_DISCOUNT' ? 'PERCENTAGE' : 'FIXED',
          value:
            reward.reward_type === 'PERCENTAGE_DISCOUNT'
              ? parseFloat(reward.discount_percent) || 0
              : parseFloat(reward.discount_amount) || 0,
          max_discount: reward.reward_type === 'PERCENTAGE_DISCOUNT' ? null : null,
          redemption_id: redemption.id,
          reward_id: reward.id,
          reward_type: reward.reward_type,
        },
        redemption,
      };
    } catch (error) {
      console.error('[ERROR] Verify reward code error:', error.message);
      if (error.response) {
        // API error response
        return {
          success: false,
          error: error.response.data?.message || 'Failed to verify redemption code',
        };
      } else if (error.request) {
        // Request made but no response
        return {
          success: false,
          error: 'Cannot connect to member service',
        };
      } else {
        // Error setting up request
        return {
          success: false,
          error: error.message || 'Failed to verify redemption code',
        };
      }
    }
  }

  /**
   * Mark redemption as used after successful payment
   * @param {string} redemptionId - Redemption ID
   * @param {string} subscriptionId - Subscription ID (optional)
   * @returns {Promise<Object>} Result
   */
  async markRedemptionAsUsed(redemptionId, subscriptionId = null) {
    try {
      const memberServiceUrl = process.env.MEMBER_SERVICE_URL || 'http://localhost:3002';

      // Call member-service to mark redemption as used
      // Route: PUT /redemptions/:id/mark-used
      const response = await axios.put(
        `${memberServiceUrl}/redemptions/${redemptionId}/mark-used`,
        {
          subscription_id: subscriptionId,
          used_at: new Date().toISOString(),
        },
        {
          headers: {
            'Content-Type': 'application/json',
          },
          timeout: 10000,
        }
      );

      if (!response.data.success) {
        return {
          success: false,
          error: response.data.message || 'Failed to mark redemption as used',
        };
      }

      return {
        success: true,
        redemption: response.data.data,
      };
    } catch (error) {
      console.error('[ERROR] Mark redemption as used error:', error.message);
      return {
        success: false,
        error: error.message || 'Failed to mark redemption as used',
      };
    }
  }
}

module.exports = new RewardDiscountService();

