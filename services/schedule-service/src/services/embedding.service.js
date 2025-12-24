/**
 * Embedding Service cho Schedule Service
 * Tạo vector embedding từ text cho classes
 */

const axios = require('axios');

class EmbeddingService {
  constructor() {
    this.apiKey = process.env.AI_API_KEY;
    // OpenRouter embeddings endpoint
    this.apiUrl = process.env.AI_MODEL_URL || 'https://openrouter.ai/api/v1';
    
    if (!this.apiKey) {
      console.warn('[WARNING] AI_API_KEY not set - embedding generation will fail');
    }
    
    console.log('[CONFIG] EmbeddingService initialized:', {
      apiUrl: this.apiUrl,
      hasApiKey: !!this.apiKey,
    });
  }

  /**
   * Generate embedding từ text sử dụng OpenAI text-embedding-ada-002 hoặc tương đương
   * @param {string} text - Text cần tạo embedding
   * @returns {Promise<number[]>} - Vector embedding 1536 chiều
   */
  async generateEmbedding(text) {
    if (!text || text.trim().length === 0) {
      throw new Error('Text cannot be empty');
    }

    if (!this.apiKey) {
      throw new Error('AI_API_KEY is required for embedding generation');
    }

    try {
      // Sử dụng OpenRouter API với embedding model
      const embeddingModel = process.env.EMBEDDING_MODEL || 'openai/text-embedding-ada-002';
      
      // OpenRouter embeddings endpoint - must use /v1/embeddings
      let embeddingsUrl;
      let baseUrl = this.apiUrl;
      
      // Remove /chat/completions if it exists
      if (baseUrl.includes('/chat/completions')) {
        baseUrl = baseUrl.replace('/chat/completions', '');
      }
      
      // Ensure we have /v1/embeddings
      if (baseUrl.endsWith('/v1')) {
        embeddingsUrl = `${baseUrl}/embeddings`;
      } else if (baseUrl.endsWith('/v1/')) {
        embeddingsUrl = `${baseUrl}embeddings`;
      } else if (baseUrl.includes('/v1/')) {
        embeddingsUrl = `${baseUrl}/embeddings`;
      } else if (baseUrl.endsWith('/api')) {
        embeddingsUrl = `${baseUrl}/v1/embeddings`;
      } else {
        embeddingsUrl = `${baseUrl}/v1/embeddings`;
      }
      
      console.log('[SEARCH] Calling embedding API:', embeddingsUrl);
      console.log('[PROCESS] Model:', embeddingModel);
      console.log('📄 Text length:', text.length);
      
      const response = await axios.post(
        embeddingsUrl,
        {
          model: embeddingModel,
          input: text, // OpenAI embeddings format uses "input" field
        },
        {
          headers: {
            'Authorization': `Bearer ${this.apiKey}`,
            'Content-Type': 'application/json',
            'HTTP-Referer': process.env.AI_API_REFERER || '',
            'X-Title': 'GYM-147 Embedding Service',
          },
          timeout: 30000,
        }
      );

      if (response.data && response.data.data && response.data.data[0]) {
        const embedding = response.data.data[0].embedding;
        
        // Validate embedding dimension (should be 1536 for ada-002)
        if (embedding.length !== 1536) {
          console.warn(`[WARNING] Embedding dimension is ${embedding.length}, expected 1536`);
        }
        
        return embedding;
      } else {
        throw new Error('Invalid response from embedding API');
      }
    } catch (error) {
      console.error('[ERROR] Error generating embedding:', error.message);
      if (error.response) {
        console.error('Response data:', error.response.data);
      }
      throw error;
    }
  }

  /**
   * Tạo class description text để generate embedding
   * @param {Object} gymClass - GymClass object
   * @returns {string} - Class description text
   */
  buildClassDescriptionText(gymClass) {
    const parts = [];

    // Tên và mô tả
    parts.push(gymClass.name);
    if (gymClass.description) {
      parts.push(gymClass.description);
    }

    // Category
    parts.push(`Danh mục: ${gymClass.category}`);

    // Difficulty
    parts.push(`Độ khó: ${gymClass.difficulty}`);

    // Equipment
    if (gymClass.equipment_needed && gymClass.equipment_needed.length > 0) {
      parts.push(`Thiết bị: ${gymClass.equipment_needed.join(', ')}`);
    }

    // Duration
    if (gymClass.duration) {
      parts.push(`Thời lượng: ${gymClass.duration} phút`);
    }

    return parts.join('. ');
  }

  /**
   * Format vector array thành string cho PostgreSQL
   * @param {number[]} vector - Vector array
   * @returns {string} - PostgreSQL vector string format: [0.1,0.2,0.3,...]
   */
  formatVectorForPostgres(vector) {
    if (!Array.isArray(vector) || vector.length === 0) {
      throw new Error('Invalid vector: must be a non-empty array');
    }
    return '[' + vector.join(',') + ']';
  }
}

module.exports = new EmbeddingService();


















