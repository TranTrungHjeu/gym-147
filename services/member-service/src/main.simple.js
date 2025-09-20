const cors = require('cors');
const express = require('express');
const helmet = require('helmet');
const morgan = require('morgan');
const { connectDatabase } = require('./lib/prisma.js');
const { memberService } = require('./services/member.prisma.service.js');

const app = express();

// Async function to start server
async function startServer() {
  try {
    // Kết nối database trước khi start server
    await connectDatabase();
    console.log('✅ Database connected successfully');

    // Middleware
    app.use(express.json());
    app.use(cors());
    app.use(helmet());
    app.use(morgan('dev'));

    // Health check endpoint
    app.get('/health', (req, res) => {
      res.json({ 
        service: 'member-service', 
        status: 'ok',
        timestamp: new Date().toISOString()
      });
    });

    // Members API endpoints
    app.get('/members', async (req, res) => {
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
        
        res.json({
          success: true,
          data: result,
          message: 'Members retrieved successfully'
        });
      } catch (error) {
        console.error('Error getting members:', error);
        res.status(500).json({
          success: false,
          message: error.message || 'Failed to retrieve members',
          data: null
        });
      }
    });

    app.get('/members/stats', async (req, res) => {
      try {
        const stats = await memberService.getMemberStats();
        
        res.json({
          success: true,
          data: stats,
          message: 'Member statistics retrieved successfully'
        });
      } catch (error) {
        console.error('Error getting member stats:', error);
        res.status(500).json({
          success: false,
          message: error.message || 'Failed to retrieve member statistics',
          data: null
        });
      }
    });

    app.get('/members/:id', async (req, res) => {
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

        res.json({
          success: true,
          data: member,
          message: 'Member retrieved successfully'
        });
      } catch (error) {
        console.error('Error getting member:', error);
        res.status(500).json({
          success: false,
          message: error.message || 'Failed to retrieve member',
          data: null
        });
      }
    });

    app.post('/members', async (req, res) => {
      try {
        const memberData = req.body;
        const member = await memberService.createMember(memberData);
        
        res.status(201).json({
          success: true,
          data: member,
          message: 'Member created successfully'
        });
      } catch (error) {
        console.error('Error creating member:', error);
        res.status(400).json({
          success: false,
          message: error.message || 'Failed to create member',
          data: null
        });
      }
    });

    app.put('/members/:id', async (req, res) => {
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

        res.json({
          success: true,
          data: member,
          message: 'Member updated successfully'
        });
      } catch (error) {
        console.error('Error updating member:', error);
        res.status(400).json({
          success: false,
          message: error.message || 'Failed to update member',
          data: null
        });
      }
    });

    app.delete('/members/:id', async (req, res) => {
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

        res.json({
          success: true,
          data: true,
          message: 'Member deleted successfully'
        });
      } catch (error) {
        console.error('Error deleting member:', error);
        res.status(500).json({
          success: false,
          message: error.message || 'Failed to delete member',
          data: null
        });
      }
    });

    // Error handling middleware
    app.use((err, req, res, next) => {
      console.error(err.stack);
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        data: null
      });
    });

    // 404 handler
    app.use('*', (req, res) => {
      res.status(404).json({
        success: false,
        message: 'Route not found',
        data: null
      });
    });

    const port = process.env.PORT || 3001;
    app.listen(port, () => {
      console.log(`🚀 Member Service listening on port ${port}`);
      console.log(`📊 API endpoints available at http://localhost:${port}/members`);
    });

  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
}

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('SIGTERM received, shutting down gracefully');
  await require('./lib/prisma.js').prisma.$disconnect();
  process.exit(0);
});

process.on('SIGINT', async () => {
  console.log('SIGINT received, shutting down gracefully');
  await require('./lib/prisma.js').prisma.$disconnect();
  process.exit(0);
});

// Start the server
startServer();