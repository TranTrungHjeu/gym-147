const prisma = require('../lib/prisma.js').prisma;
const crypto = require('crypto');

class APIKeyController {
  /**
   * Generate a secure API key
   */
  generateAPIKey() {
    const randomBytes = crypto.randomBytes(32);
    const key = `gym147_${randomBytes.toString('base64url')}`;
    const hash = crypto.createHash('sha256').update(key).digest('hex');
    const prefix = key.substring(0, 8);
    return { key, hash, prefix };
  }

  /**
   * Get all API keys
   */
  async getAPIKeys(req, res) {
    try {
      const apiKeys = await prisma.aPIKey.findMany({
        orderBy: {
          created_at: 'desc',
        },
        select: {
          id: true,
          name: true,
          key_prefix: true,
          permissions: true,
          rate_limit: true,
          expires_at: true,
          last_used_at: true,
          is_active: true,
          created_at: true,
          updated_at: true,
        },
      });

      res.json({
        success: true,
        message: 'API keys retrieved successfully',
        data: apiKeys,
      });
    } catch (error) {
      console.error('Get API keys error:', error);
      res.status(500).json({
        success: false,
        message: 'Có lỗi xảy ra khi lấy danh sách API keys',
        data: null,
      });
    }
  }

  /**
   * Get a single API key by ID
   */
  async getAPIKey(req, res) {
    try {
      const { id } = req.params;

      const apiKey = await prisma.aPIKey.findUnique({
        where: { id },
        select: {
          id: true,
          name: true,
          key_prefix: true,
          permissions: true,
          rate_limit: true,
          expires_at: true,
          last_used_at: true,
          is_active: true,
          created_at: true,
          updated_at: true,
        },
      });

      if (!apiKey) {
        return res.status(404).json({
          success: false,
          message: 'API key not found',
          data: null,
        });
      }

      res.json({
        success: true,
        message: 'API key retrieved successfully',
        data: apiKey,
      });
    } catch (error) {
      console.error('Get API key error:', error);
      res.status(500).json({
        success: false,
        message: 'Có lỗi xảy ra khi lấy API key',
        data: null,
      });
    }
  }

  /**
   * Create a new API key
   */
  async createAPIKey(req, res) {
    try {
      const { name, permissions, rate_limit, expires_at } = req.body;

      if (!name || !permissions || !Array.isArray(permissions) || permissions.length === 0) {
        return res.status(400).json({
          success: false,
          message: 'Name and permissions are required',
          data: null,
        });
      }

      // Generate API key
      const { key, hash, prefix } = this.generateAPIKey();

      // Check if expires_at is in the future
      let expiresAt = null;
      if (expires_at) {
        expiresAt = new Date(expires_at);
        if (expiresAt <= new Date()) {
          return res.status(400).json({
            success: false,
            message: 'Expiration date must be in the future',
            data: null,
          });
        }
      }

      const apiKey = await prisma.aPIKey.create({
        data: {
          name,
          key: hash, // Store hashed key
          key_prefix: prefix,
          permissions,
          rate_limit: rate_limit || null,
          expires_at: expiresAt,
          is_active: true,
        },
      });

      // Return the plain key only once (for display to user)
      res.status(201).json({
        success: true,
        message: 'API key created successfully',
        data: {
          ...apiKey,
          key, // Include plain key in response (only time it's shown)
        },
      });
    } catch (error) {
      console.error('Create API key error:', error);
      res.status(500).json({
        success: false,
        message: 'Có lỗi xảy ra khi tạo API key',
        data: null,
      });
    }
  }

  /**
   * Update API key
   */
  async updateAPIKey(req, res) {
    try {
      const { id } = req.params;
      const { name, permissions, rate_limit, expires_at, is_active } = req.body;

      const updateData = {};
      if (name !== undefined) updateData.name = name;
      if (permissions !== undefined) updateData.permissions = permissions;
      if (rate_limit !== undefined) updateData.rate_limit = rate_limit || null;
      if (expires_at !== undefined) {
        if (expires_at) {
          const expiresAt = new Date(expires_at);
          if (expiresAt <= new Date()) {
            return res.status(400).json({
              success: false,
              message: 'Expiration date must be in the future',
              data: null,
            });
          }
          updateData.expires_at = expiresAt;
        } else {
          updateData.expires_at = null;
        }
      }
      if (is_active !== undefined) updateData.is_active = is_active;

      const apiKey = await prisma.aPIKey.update({
        where: { id },
        data: updateData,
        select: {
          id: true,
          name: true,
          key_prefix: true,
          permissions: true,
          rate_limit: true,
          expires_at: true,
          last_used_at: true,
          is_active: true,
          created_at: true,
          updated_at: true,
        },
      });

      res.json({
        success: true,
        message: 'API key updated successfully',
        data: apiKey,
      });
    } catch (error) {
      if (error.code === 'P2025') {
        return res.status(404).json({
          success: false,
          message: 'API key not found',
          data: null,
        });
      }

      console.error('Update API key error:', error);
      res.status(500).json({
        success: false,
        message: 'Có lỗi xảy ra khi cập nhật API key',
        data: null,
      });
    }
  }

  /**
   * Revoke API key
   */
  async revokeAPIKey(req, res) {
    try {
      const { id } = req.params;

      const apiKey = await prisma.aPIKey.update({
        where: { id },
        data: {
          is_active: false,
        },
        select: {
          id: true,
          name: true,
          key_prefix: true,
          permissions: true,
          rate_limit: true,
          expires_at: true,
          last_used_at: true,
          is_active: true,
          created_at: true,
          updated_at: true,
        },
      });

      res.json({
        success: true,
        message: 'API key revoked successfully',
        data: apiKey,
      });
    } catch (error) {
      if (error.code === 'P2025') {
        return res.status(404).json({
          success: false,
          message: 'API key not found',
          data: null,
        });
      }

      console.error('Revoke API key error:', error);
      res.status(500).json({
        success: false,
        message: 'Có lỗi xảy ra khi thu hồi API key',
        data: null,
      });
    }
  }

  /**
   * Delete API key
   */
  async deleteAPIKey(req, res) {
    try {
      const { id } = req.params;

      await prisma.aPIKey.delete({
        where: { id },
      });

      res.json({
        success: true,
        message: 'API key deleted successfully',
        data: null,
      });
    } catch (error) {
      if (error.code === 'P2025') {
        return res.status(404).json({
          success: false,
          message: 'API key not found',
          data: null,
        });
      }

      console.error('Delete API key error:', error);
      res.status(500).json({
        success: false,
        message: 'Có lỗi xảy ra khi xóa API key',
        data: null,
      });
    }
  }

  /**
   * Validate API key (middleware helper)
   */
  async validateAPIKey(key) {
    try {
      const hash = crypto.createHash('sha256').update(key).digest('hex');
      const apiKey = await prisma.aPIKey.findFirst({
        where: {
          key: hash,
          is_active: true,
        },
      });

      if (!apiKey) {
        return { valid: false, error: 'Invalid API key' };
      }

      // Check expiration
      if (apiKey.expires_at && new Date(apiKey.expires_at) < new Date()) {
        return { valid: false, error: 'API key has expired' };
      }

      // Update last used
      await prisma.aPIKey.update({
        where: { id: apiKey.id },
        data: { last_used_at: new Date() },
      });

      return { valid: true, apiKey };
    } catch (error) {
      console.error('Validate API key error:', error);
      return { valid: false, error: 'Error validating API key' };
    }
  }
}

module.exports = new APIKeyController();

