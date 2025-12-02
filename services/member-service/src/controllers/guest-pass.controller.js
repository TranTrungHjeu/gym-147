const guestPassService = require('../services/guest-pass.service.js');

class GuestPassController {
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
   * Create a new guest pass
   */
  async createGuestPass(req, res) {
    try {
      const guestPassData = req.body;

      // Validate required fields
      if (!guestPassData.member_id || !guestPassData.guest_name || !guestPassData.pass_type) {
        return res.status(400).json({
          success: false,
          message: 'member_id, guest_name, and pass_type are required',
          data: null,
        });
      }

      const result = await guestPassService.createGuestPass(guestPassData);

      if (!result.success) {
        return res.status(400).json({
          success: false,
          message: result.error,
          data: null,
        });
      }

      res.status(201).json({
        success: true,
        message: 'Guest pass created successfully',
        data: result.guestPass,
      });
    } catch (error) {
      console.error('Create guest pass error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        data: null,
      });
    }
  }

  /**
   * Get all guest passes with filters
   */
  async getGuestPasses(req, res) {
    try {
      const filters = {
        page: req.query.page,
        limit: req.query.limit,
        status: req.query.status,
        pass_type: req.query.pass_type,
        member_id: req.query.member_id,
        search: req.query.search,
        startDate: req.query.startDate,
        endDate: req.query.endDate,
      };

      const result = await guestPassService.getGuestPasses(filters);

      if (!result.success) {
        return res.status(500).json({
          success: false,
          message: result.error,
          data: null,
        });
      }

      res.json({
        success: true,
        message: 'Guest passes retrieved successfully',
        data: {
          guest_passes: result.guestPasses,
          total: result.total,
          page: result.page,
          totalPages: result.totalPages,
        },
      });
    } catch (error) {
      console.error('Get guest passes error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        data: null,
      });
    }
  }

  /**
   * Get guest pass by ID
   */
  async getGuestPassById(req, res) {
    try {
      const { id } = req.params;

      const result = await guestPassService.getGuestPassById(id);

      if (!result.success) {
        return res.status(404).json({
          success: false,
          message: result.error,
          data: null,
        });
      }

      res.json({
        success: true,
        message: 'Guest pass retrieved successfully',
        data: result.guestPass,
      });
    } catch (error) {
      console.error('Get guest pass by ID error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        data: null,
      });
    }
  }

  /**
   * Update guest pass
   */
  async updateGuestPass(req, res) {
    try {
      const { id } = req.params;
      const updateData = req.body;

      const result = await guestPassService.updateGuestPass(id, updateData);

      if (!result.success) {
        return res.status(400).json({
          success: false,
          message: result.error,
          data: null,
        });
      }

      res.json({
        success: true,
        message: 'Guest pass updated successfully',
        data: result.guestPass,
      });
    } catch (error) {
      console.error('Update guest pass error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        data: null,
      });
    }
  }

  /**
   * Delete guest pass
   */
  async deleteGuestPass(req, res) {
    try {
      const { id } = req.params;

      const result = await guestPassService.deleteGuestPass(id);

      if (!result.success) {
        return res.status(400).json({
          success: false,
          message: result.error,
          data: null,
        });
      }

      res.json({
        success: true,
        message: 'Guest pass deleted successfully',
        data: null,
      });
    } catch (error) {
      console.error('Delete guest pass error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        data: null,
      });
    }
  }

  /**
   * Cancel guest pass
   */
  async cancelGuestPass(req, res) {
    try {
      const { id } = req.params;
      const { reason } = req.body;

      const result = await guestPassService.cancelGuestPass(id, reason);

      if (!result.success) {
        return res.status(400).json({
          success: false,
          message: result.error,
          data: null,
        });
      }

      res.json({
        success: true,
        message: 'Guest pass cancelled successfully',
        data: result.guestPass,
      });
    } catch (error) {
      console.error('Cancel guest pass error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        data: null,
      });
    }
  }

  /**
   * Use guest pass (record access)
   */
  async useGuestPass(req, res) {
    try {
      const { id } = req.params;
      const accessData = req.body;

      const result = await guestPassService.useGuestPass(id, accessData);

      if (!result.success) {
        return res.status(400).json({
          success: false,
          message: result.error,
          data: null,
        });
      }

      res.json({
        success: true,
        message: 'Guest pass used successfully',
        data: {
          guestPass: result.guestPass,
          accessLog: result.accessLog,
        },
      });
    } catch (error) {
      console.error('Use guest pass error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        data: null,
      });
    }
  }

  /**
   * Get guest pass statistics
   */
  async getGuestPassStats(req, res) {
    try {
      const filters = {
        member_id: req.query.member_id,
        startDate: req.query.startDate,
        endDate: req.query.endDate,
      };

      const result = await guestPassService.getGuestPassStats(filters);

      if (!result.success) {
        return res.status(500).json({
          success: false,
          message: result.error,
          data: null,
        });
      }

      res.json({
        success: true,
        message: 'Guest pass statistics retrieved successfully',
        data: result.stats,
      });
    } catch (error) {
      console.error('Get guest pass stats error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        data: null,
      });
    }
  }
}

module.exports = new GuestPassController();


