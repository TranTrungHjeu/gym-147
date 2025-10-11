const { prisma } = require('../lib/prisma.js');

class DeviceController {
  /**
   * Get user devices/sessions
   */
  async getDevices(req, res) {
    try {
      const userId = req.user.id;

      const sessions = await prisma.session.findMany({
        where: { user_id: userId },
        select: {
          id: true,
          device_info: true,
          ip_address: true,
          user_agent: true,
          created_at: true,
          last_used_at: true,
          expires_at: true,
        },
        orderBy: { last_used_at: 'desc' },
      });

      res.json({
        success: true,
        message: 'Devices retrieved successfully',
        data: { devices: sessions },
      });
    } catch (error) {
      console.error('Get devices error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        data: null,
      });
    }
  }

  /**
   * Logout specific device
   */
  async logoutDevice(req, res) {
    try {
      const userId = req.user.id;
      const { deviceId } = req.params;

      const session = await prisma.session.findFirst({
        where: {
          id: deviceId,
          user_id: userId,
        },
      });

      if (!session) {
        return res.status(404).json({
          success: false,
          message: 'Device not found',
          data: null,
        });
      }

      await prisma.session.delete({
        where: { id: deviceId },
      });

      res.json({
        success: true,
        message: 'Device đã được đăng xuất',
        data: null,
      });
    } catch (error) {
      console.error('Logout device error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        data: null,
      });
    }
  }

  /**
   * Revoke all sessions
   */
  async revokeAllSessions(req, res) {
    try {
      const userId = req.user.id;

      await prisma.session.deleteMany({
        where: { user_id: userId },
      });

      res.json({
        success: true,
        message: 'Tất cả thiết bị đã được đăng xuất',
        data: null,
      });
    } catch (error) {
      console.error('Revoke all sessions error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        data: null,
      });
    }
  }

  /**
   * Get session info
   */
  async getSessionInfo(req, res) {
    try {
      const userId = req.user.id;
      const sessionId = req.user.sessionId;

      const session = await prisma.session.findUnique({
        where: { id: sessionId },
        select: {
          id: true,
          device_info: true,
          ip_address: true,
          user_agent: true,
          created_at: true,
          last_used_at: true,
          expires_at: true,
        },
      });

      if (!session) {
        return res.status(404).json({
          success: false,
          message: 'Session not found',
          data: null,
        });
      }

      res.json({
        success: true,
        message: 'Session info retrieved successfully',
        data: { session },
      });
    } catch (error) {
      console.error('Get session info error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        data: null,
      });
    }
  }
}

module.exports = { DeviceController };
