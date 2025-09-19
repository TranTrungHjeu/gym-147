import { Request, Response } from 'express';
import { memberService } from '../services/member.service.js';
import { ApiResponse } from '../types/api.types.js';

export class MemberController {
  // Get all members with filtering and pagination
  async getMembers(req: Request, res: Response) {
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
        search: search as string,
        status: status as string,
      };

      const result = await memberService.getMembers(filters);
      
      const response: ApiResponse<typeof result> = {
        success: true,
        data: result,
        message: 'Members retrieved successfully'
      };

      res.json(response);
    } catch (error: any) {
      res.status(500).json({
        success: false,
        message: error.message || 'Failed to retrieve members',
        data: null
      });
    }
  }

  // Get single member by ID
  async getMember(req: Request, res: Response) {
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

      const response: ApiResponse<typeof member> = {
        success: true,
        data: member,
        message: 'Member retrieved successfully'
      };

      res.json(response);
    } catch (error: any) {
      res.status(500).json({
        success: false,
        message: error.message || 'Failed to retrieve member',
        data: null
      });
    }
  }

  // Create new member
  async createMember(req: Request, res: Response) {
    try {
      const memberData = req.body;
      const member = await memberService.createMember(memberData);
      
      const response: ApiResponse<typeof member> = {
        success: true,
        data: member,
        message: 'Member created successfully'
      };

      res.status(201).json(response);
    } catch (error: any) {
      res.status(400).json({
        success: false,
        message: error.message || 'Failed to create member',
        data: null
      });
    }
  }

  // Update member
  async updateMember(req: Request, res: Response) {
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

      const response: ApiResponse<typeof member> = {
        success: true,
        data: member,
        message: 'Member updated successfully'
      };

      res.json(response);
    } catch (error: any) {
      res.status(400).json({
        success: false,
        message: error.message || 'Failed to update member',
        data: null
      });
    }
  }

  // Delete member
  async deleteMember(req: Request, res: Response) {
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

      const response: ApiResponse<boolean> = {
        success: true,
        data: true,
        message: 'Member deleted successfully'
      };

      res.json(response);
    } catch (error: any) {
      res.status(500).json({
        success: false,
        message: error.message || 'Failed to delete member',
        data: null
      });
    }
  }

  // Get member statistics
  async getMemberStats(req: Request, res: Response) {
    try {
      const stats = await memberService.getMemberStats();
      
      const response: ApiResponse<typeof stats> = {
        success: true,
        data: stats,
        message: 'Member statistics retrieved successfully'
      };

      res.json(response);
    } catch (error: any) {
      res.status(500).json({
        success: false,
        message: error.message || 'Failed to retrieve member statistics',
        data: null
      });
    }
  }
}