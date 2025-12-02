const aiService = require('../services/ai.service');
const embeddingService = require('../services/embedding.service.js');

class AIController {
  /**
   * Generate embedding từ text
   * POST /ai/embeddings
   * Body: { text: "Tôi muốn tăng cơ bắp" }
   */
  async generateEmbedding(req, res) {
    try {
      const { text } = req.body;

      if (!text || text.trim().length === 0) {
        return res.status(400).json({
          success: false,
          message: 'Text is required',
          data: null,
        });
      }

      const embedding = await embeddingService.generateEmbedding(text);

      res.json({
        success: true,
        message: 'Embedding generated successfully',
        data: {
          embedding,
          dimension: embedding.length,
        },
      });
    } catch (error) {
      console.error('[ERROR] Error generating embedding:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to generate embedding',
        data: { error: error.message },
      });
    }
  }

  // Generate class recommendations using AI
  async generateClassRecommendations(req, res) {
    try {
      const {
        member,
        attendanceHistory,
        bookingsHistory,
        favorites,
        upcomingSchedules,
        fitnessGoals,
      } = req.body;

      if (!member) {
        return res.status(400).json({
          success: false,
          message: 'Member data is required',
          data: null,
        });
      }

      const result = await aiService.generateClassRecommendations({
        member,
        attendanceHistory: attendanceHistory || [],
        bookingsHistory: bookingsHistory || [],
        favorites: favorites || [],
        upcomingSchedules: upcomingSchedules || [],
        fitnessGoals: fitnessGoals || member.fitness_goals || [],
      });

      if (result.success) {
        res.json({
          success: true,
          message: 'Class recommendations generated successfully',
          data: {
            recommendations: result.recommendations,
            analysis: result.analysis,
          },
        });
      } else {
        res.status(500).json({
          success: false,
          message: 'Failed to generate recommendations',
          error: result.error,
          data: {
            recommendations: [],
          },
        });
      }
    } catch (error) {
      console.error('Generate class recommendations error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        data: null,
      });
    }
  }

  // Generate smart scheduling suggestions using AI
  async generateSchedulingSuggestions(req, res) {
    try {
      const { member, analysis, attendanceHistory, bookingsHistory } = req.body;

      if (!member) {
        return res.status(400).json({
          success: false,
          message: 'Member data is required',
          data: null,
        });
      }

      if (!analysis) {
        return res.status(400).json({
          success: false,
          message: 'Analysis data is required',
          data: null,
        });
      }

      const result = await aiService.generateSchedulingSuggestions({
        member,
        analysis,
        attendanceHistory: attendanceHistory || [],
        bookingsHistory: bookingsHistory || [],
      });

      if (result.success) {
        res.json({
          success: true,
          message: 'Scheduling suggestions generated successfully',
          data: {
            suggestions: result.suggestions,
          },
        });
      } else {
        res.status(500).json({
          success: false,
          message: 'Failed to generate suggestions',
          error: result.error,
          data: {
            suggestions: [],
          },
        });
      }
    } catch (error) {
      console.error('Generate scheduling suggestions error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        data: null,
      });
    }
  }
}

module.exports = new AIController();
