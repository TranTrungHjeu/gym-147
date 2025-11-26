/**
 * Search Controller - Semantic Search endpoint
 */

const vectorSearchService = require('../services/vector-search.service.js');
// Import embedding service from member-service
// Note: In production, this should be called via HTTP API
let embeddingService;
try {
  embeddingService = require('../../member-service/src/services/embedding.service.js');
} catch (e) {
  // Fallback: use HTTP client to call member-service
  const { createHttpClient } = require('../services/http-client.js');
  const { MEMBER_SERVICE_URL } = require('../config/serviceUrls.js');
  const memberClient = createHttpClient(MEMBER_SERVICE_URL);
  
  embeddingService = {
    generateEmbedding: async (text) => {
      const response = await memberClient.post('/ai/embeddings', { text });
      return response.data.data.embedding;
    }
  };
}

class SearchController {
  /**
   * Semantic search - Tìm kiếm classes dựa trên query text
   * POST /classes/search/semantic
   * Body: { query: "Tôi muốn tăng cơ bắp chân" }
   */
  async semanticSearch(req, res) {
    try {
      const { query } = req.body;

      if (!query || query.trim().length === 0) {
        return res.status(400).json({
          success: false,
          message: 'Query text is required',
          data: null,
        });
      }

      // Step 1: Generate embedding từ query
      console.log('🔍 Generating embedding for query:', query);
      const queryVector = await embeddingService.generateEmbedding(query);

      // Step 2: Vector search
      console.log('🔍 Performing semantic search...');
      const results = await vectorSearchService.semanticSearch(queryVector, 10);

      res.json({
        success: true,
        message: 'Semantic search completed',
        data: {
          query,
          results,
          count: results.length,
        },
      });
    } catch (error) {
      console.error('❌ Semantic search error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        data: null,
      });
    }
  }
}

module.exports = new SearchController();

