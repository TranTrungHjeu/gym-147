const rewardService = require('../services/reward.service.js');
const s3UploadService = require('../services/s3-upload.service');

class RewardController {
  /**
   * Helper function to get userId from JWT token
   */
  getUserIdFromToken(req) {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return null;
    }

    try {
      const token = authHeader.split(' ')[1];
      const tokenParts = token.split('.');
      if (tokenParts.length !== 3) {
        return null;
      }

      // Add padding to base64 if needed
      let payloadBase64 = tokenParts[1];
      while (payloadBase64.length % 4) {
        payloadBase64 += '=';
      }

      const payload = JSON.parse(Buffer.from(payloadBase64, 'base64').toString());
      return payload.userId || payload.id;
    } catch (error) {
      console.error('Error decoding JWT token:', error);
      return null;
    }
  }

  /**
   * Create a new reward (Admin only)
   */
  async createReward(req, res) {
    try {
      const rewardData = req.body;
      
      // Get userId from token and set created_by
      const userId = this.getUserIdFromToken(req);
      if (userId) {
        rewardData.created_by = userId;
      }
      
      const result = await rewardService.createReward(rewardData);

      if (!result.success) {
        return res.status(400).json({
          success: false,
          message: result.error,
          data: null,
        });
      }

      res.status(201).json({
        success: true,
        message: 'Reward created successfully',
        data: result.reward,
      });
    } catch (error) {
      console.error('Create reward error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        data: null,
      });
    }
  }

  /**
   * Get all available rewards
   */
  async getRewards(req, res) {
    try {
      const { category, min_points, max_points } = req.query;
      const filters = {};

      if (category) filters.category = category;
      if (min_points) filters.min_points = parseInt(min_points);
      if (max_points) filters.max_points = parseInt(max_points);

      const result = await rewardService.getRewards(filters);

      if (!result.success) {
        return res.status(500).json({
          success: false,
          message: result.error,
          data: null,
        });
      }

      res.json({
        success: true,
        message: 'Rewards retrieved successfully',
        data: result.rewards,
      });
    } catch (error) {
      console.error('Get rewards error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        data: null,
      });
    }
  }

  /**
   * Get reward by ID
   */
  async getRewardById(req, res) {
    try {
      const { id } = req.params;
      const result = await rewardService.getRewardById(id);

      if (!result.success) {
        return res.status(404).json({
          success: false,
          message: result.error,
          data: null,
        });
      }

      res.json({
        success: true,
        message: 'Reward retrieved successfully',
        data: result.reward,
      });
    } catch (error) {
      console.error('Get reward by ID error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        data: null,
      });
    }
  }

  /**
   * Redeem a reward
   */
  async redeemReward(req, res) {
    try {
      const { rewardId } = req.params;
      const { memberId } = req.body;
      const member_id = memberId || req.user?.member_id || req.body.member_id;

      if (!member_id) {
        return res.status(400).json({
          success: false,
          message: 'Member ID is required',
          data: null,
        });
      }

      const result = await rewardService.redeemReward(member_id, rewardId);

      if (!result.success) {
        return res.status(400).json({
          success: false,
          message: result.error,
          data: result.required
            ? {
                required: result.required,
                current: result.current,
              }
            : null,
        });
      }

      res.json({
        success: true,
        message: 'Reward redeemed successfully',
        data: result.redemption,
      });
    } catch (error) {
      console.error('Redeem reward error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        data: null,
      });
    }
  }

  /**
   * Get member's redemption history
   */
  async getMemberRedemptions(req, res) {
    try {
      const { id } = req.params;
      const { status, limit, offset } = req.query;

      const result = await rewardService.getMemberRedemptions(id, {
        status,
        limit: limit ? parseInt(limit) : 50,
        offset: offset ? parseInt(offset) : 0,
      });

      if (!result.success) {
        return res.status(500).json({
          success: false,
          message: result.error,
          data: null,
        });
      }

      res.json({
        success: true,
        message: 'Redemption history retrieved successfully',
        data: result.redemptions,
        pagination: result.pagination,
      });
    } catch (error) {
      console.error('Get member redemptions error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        data: null,
      });
    }
  }

  /**
   * Verify redemption code
   */
  async verifyCode(req, res) {
    try {
      const { code } = req.body;

      if (!code) {
        return res.status(400).json({
          success: false,
          message: 'Redemption code is required',
          data: null,
        });
      }

      const result = await rewardService.verifyCode(code);

      if (!result.success) {
        return res.status(400).json({
          success: false,
          message: result.error,
          data: null,
        });
      }

      res.json({
        success: true,
        message: 'Code verified successfully',
        data: result.redemption,
      });
    } catch (error) {
      console.error('Verify code error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        data: null,
      });
    }
  }

  /**
   * Update reward (Admin only)
   */
  async updateReward(req, res) {
    try {
      const { id } = req.params;
      const updateData = req.body;
      
      console.log(`[PROCESS] Updating reward ${id} with data:`, JSON.stringify(updateData, null, 2));
      
      const result = await rewardService.updateReward(id, updateData);

      if (!result.success) {
        console.error(`[ERROR] Failed to update reward ${id}:`, result.error);
        return res.status(400).json({
          success: false,
          message: result.error,
          data: null,
        });
      }

      console.log(`[SUCCESS] Successfully updated reward ${id}`);
      res.json({
        success: true,
        message: 'Reward updated successfully',
        data: result.reward,
      });
    } catch (error) {
      console.error('Update reward error:', error);
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
   * Delete reward (Admin only)
   */
  async deleteReward(req, res) {
    try {
      const { id } = req.params;
      const result = await rewardService.deleteReward(id);

      if (!result.success) {
        return res.status(400).json({
          success: false,
          message: result.error,
          data: null,
        });
      }

      res.json({
        success: true,
        message: 'Reward deleted successfully',
        data: null,
      });
    } catch (error) {
      console.error('Delete reward error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        data: null,
      });
    }
  }

  /**
   * Refund redemption (Admin only)
   */
  async refundRedemption(req, res) {
    try {
      const { id } = req.params;
      const { reason } = req.body;
      const result = await rewardService.refundRedemption(id, reason);

      if (!result.success) {
        return res.status(400).json({
          success: false,
          message: result.error,
          data: null,
        });
      }

      res.json({
        success: true,
        message: 'Redemption refunded successfully',
        data: {
          refunded_points: result.refunded_points,
        },
      });
    } catch (error) {
      console.error('Refund redemption error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        data: null,
      });
    }
  }

  /**
   * Get all redemptions (Admin)
   */
  async getAllRedemptions(req, res) {
    try {
      const { memberId, rewardId, status, limit, offset, startDate, endDate } = req.query;
      const result = await rewardService.getAllRedemptions({
        memberId,
        rewardId,
        status,
        limit: limit ? parseInt(limit) : 50,
        offset: offset ? parseInt(offset) : 0,
        startDate,
        endDate,
      });

      if (!result.success) {
        return res.status(500).json({
          success: false,
          message: result.error,
          data: null,
        });
      }

      res.json({
        success: true,
        message: 'Redemptions retrieved successfully',
        data: result.redemptions,
        pagination: result.pagination,
      });
    } catch (error) {
      console.error('Get all redemptions error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        data: null,
      });
    }
  }

  /**
   * Get reward statistics
   */
  async getRewardStats(req, res) {
    try {
      const { rewardId } = req.query;
      const result = await rewardService.getRewardStats(rewardId || null);

      if (!result.success) {
        return res.status(500).json({
          success: false,
          message: result.error,
          data: null,
        });
      }

      res.json({
        success: true,
        message: 'Statistics retrieved successfully',
        data: result.stats,
      });
    } catch (error) {
      console.error('Get reward stats error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        data: null,
      });
    }
  }

  /**
   * Get redemption trend
   */
  async getRedemptionTrend(req, res) {
    try {
      const { period = 'monthly', startDate, endDate } = req.query;
      const result = await rewardService.getRedemptionTrend(period, startDate, endDate);

      if (!result.success) {
        return res.status(500).json({
          success: false,
          message: result.error,
          data: null,
        });
      }

      res.json({
        success: true,
        message: 'Redemption trend retrieved successfully',
        data: result.data,
      });
    } catch (error) {
      console.error('Get redemption trend error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        data: null,
      });
    }
  }

  /**
   * Get recommended rewards for member
   */
  async getRecommendedRewards(req, res) {
    try {
      const { memberId } = req.params;
      const member_id = memberId || req.user?.member_id || req.query.memberId;

      if (!member_id) {
        return res.status(400).json({
          success: false,
          message: 'Member ID is required',
          data: null,
        });
      }

      const result = await rewardService.getRecommendedRewards(member_id);

      if (!result.success) {
        return res.status(500).json({
          success: false,
          message: result.error,
          data: null,
        });
      }

      res.json({
        success: true,
        message: 'Recommendations retrieved successfully',
        data: result.recommendations,
        preferences: result.preferences,
      });
    } catch (error) {
      console.error('Get recommended rewards error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        data: null,
      });
    }
  }

  /**
   * Generate QR code for redemption code
   */
  async generateQRCode(req, res) {
    try {
      const { code } = req.params;

      if (!code) {
        return res.status(400).json({
          success: false,
          message: 'Code is required',
          data: null,
        });
      }

      const qrcode = require('qrcode');

      // Generate QR code as data URL (PNG base64)
      const qrCodeDataURL = await qrcode.toDataURL(code, {
        width: 300,
        margin: 2,
        color: {
          dark: '#000000',
          light: '#FFFFFF',
        },
      });

      // Also generate as SVG string
      const qrCodeSVG = await qrcode.toString(code, {
        type: 'svg',
        width: 300,
        margin: 2,
      });

      res.json({
        success: true,
        message: 'QR code generated successfully',
        data: {
          code,
          qr_code_data_url: qrCodeDataURL,
          qr_code_svg: qrCodeSVG,
        },
      });
    } catch (error) {
      console.error('Generate QR code error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to generate QR code',
        data: null,
      });
    }
  }

  /**
   * Upload reward image to S3
   */
  async uploadRewardImage(req, res) {
    try {
      const { image } = req.body; // Base64 data URL from frontend

      if (!image || !image.startsWith('data:image/')) {
        return res.status(400).json({
          success: false,
          message: 'Invalid image data. Expected base64 data URL.',
          data: null,
        });
      }

      // Extract mime type and base64 data
      const matches = image.match(/^data:image\/(\w+);base64,(.+)$/);
      if (!matches) {
        return res.status(400).json({
          success: false,
          message: 'Invalid base64 format',
          data: null,
        });
      }

      const mimeType = `image/${matches[1]}`;
      const base64Data = matches[2];
      const fileBuffer = Buffer.from(base64Data, 'base64');
      const originalName = `reward_${Date.now()}.${matches[1]}`;

      // Get user ID from token if available
      let userId = 'unknown';
      const authHeader = req.headers.authorization;
      if (authHeader && authHeader.startsWith('Bearer ')) {
        try {
          const token = authHeader.split(' ')[1];
          const tokenParts = token.split('.');
          if (tokenParts.length === 3) {
            let payloadBase64 = tokenParts[1];
            while (payloadBase64.length % 4) {
              payloadBase64 += '=';
            }
            const payload = JSON.parse(Buffer.from(payloadBase64, 'base64').toString());
            userId = payload.userId || payload.id || 'unknown';
          }
        } catch (error) {
          console.warn('[WARNING] Could not extract user ID from token:', error.message);
        }
      }

      // Upload to S3 with folder 'rewards'
      const uploadResult = await s3UploadService.uploadFile(fileBuffer, originalName, mimeType, userId, {
        folder: 'rewards',
        optimize: true, // Optimize reward images
      });

      if (!uploadResult.success) {
        return res.status(500).json({
          success: false,
          message: uploadResult.error || 'Failed to upload image',
          data: null,
        });
      }

      res.json({
        success: true,
        message: 'Image uploaded successfully',
        data: {
          image_url: uploadResult.url,
          key: uploadResult.key,
        },
      });
    } catch (error) {
      console.error('Upload reward image error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        data: null,
      });
    }
  }
}

module.exports = new RewardController();

