const { memberService } = require('../services/member.prisma.service.js');

class MemberController {
  // Get all members with filtering and pagination
  async getMembers(req, res) {
    try {
      const { 
        page = 1, 
        limit = 20, 
        search, 
        status 
      } = req.query;

      const filters = {
        page: Number(page),
        limit: Number(limit),
        search: search,
        status: status,
      };

      const result = await memberService.getMembers(filters);
      
      const response = {
        success: true,
        data: result,
        message: 'Members retrieved successfully'
      };

      res.json(response);
    } catch (error) {
      res.status(500).json({
        success: false,
        message: error.message || 'Failed to retrieve members',
        data: null
      });
    }
  }

  // Get single member by ID
  async getMember(req, res) {
    try {
      const { id } = req.params;
      const member = await memberService.getMemberById(id);
      
      if (!member) {
        return res.status(404).json({
          success: false,
          message: 'Member not found',
          data: null
        });
      }

      const response = {
        success: true,
        data: member,
        message: 'Member retrieved successfully'
      };

      res.json(response);
    } catch (error) {
      res.status(500).json({
        success: false,
        message: error.message || 'Failed to retrieve member',
        data: null
      });
    }
  }

  // Create new member
  async createMember(req, res) {
    try {
      const memberData = req.body;
      const member = await memberService.createMember(memberData);
      
      const response = {
        success: true,
        data: member,
        message: 'Member created successfully'
      };

      res.status(201).json(response);
    } catch (error) {
      res.status(400).json({
        success: false,
        message: error.message || 'Failed to create member',
        data: null
      });
    }
  }

  // Update member
  async updateMember(req, res) {
    try {
      const { id } = req.params;
      const updates = req.body;
      
      const member = await memberService.updateMember(id, updates);
      
      if (!member) {
        return res.status(404).json({
          success: false,
          message: 'Member not found',
          data: null
        });
      }

      const response = {
        success: true,
        data: member,
        message: 'Member updated successfully'
      };

      res.json(response);
    } catch (error) {
      res.status(400).json({
        success: false,
        message: error.message || 'Failed to update member',
        data: null
      });
    }
  }

  // Delete member
  async deleteMember(req, res) {
    try {
      const { id } = req.params;
      const deleted = await memberService.deleteMember(id);
      
      if (!deleted) {
        return res.status(404).json({
          success: false,
          message: 'Member not found',
          data: null
        });
      }

      const response = {
        success: true,
        data: true,
        message: 'Member deleted successfully'
      };

      res.json(response);
    } catch (error) {
      res.status(500).json({
        success: false,
        message: error.message || 'Failed to delete member',
        data: null
      });
    }
  }

  // Get member statistics
  async getMemberStats(req, res) {
    try {
      const stats = await memberService.getMemberStats();
      
      const response = {
        success: true,
        data: stats,
        message: 'Member statistics retrieved successfully'
      };

      res.json(response);
    } catch (error) {
      res.status(500).json({
        success: false,
        message: error.message || 'Failed to retrieve member statistics',
        data: null
      });
    }
  }
}

module.exports = { MemberController };