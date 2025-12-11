/**
 * Vector Search Service cho Schedule Service
 * Tìm kiếm classes dựa trên vector similarity
 */

// Use the shared Prisma client from lib/prisma.js
const { prisma } = require('../lib/prisma');

class VectorSearchService {
  /**
   * Vector search trong PostgreSQL sử dụng pgvector
   * Tìm top-K classes gần nhất với member vector
   * @param {string} memberVector - Vector embedding của member (PostgreSQL format: '[0.1,0.2,...]')
   * @param {number} k - Số lượng kết quả (default: 50)
   * @returns {Promise<Array>} - Danh sách classes với similarity score
   */
  async searchSimilarClasses(memberVector, k = 50) {
    try {
      // Convert memberVector array to PostgreSQL vector format string
      // memberVector is an array like [0.1, 0.2, ...], need to convert to '[0.1,0.2,...]'
      const vectorString = Array.isArray(memberVector) 
        ? `[${memberVector.join(',')}]`
        : memberVector;

      console.log('[SEARCH] [VectorSearchService] Searching similar classes:', {
        vectorLength: Array.isArray(memberVector) ? memberVector.length : 0,
        vectorStringLength: vectorString.length,
        k,
      });

      // Sử dụng transaction để đảm bảo search_path được set đúng
      // Vector type có thể ở extensions schema
      const results = await prisma.$transaction(async (tx) => {
        // Set search_path trong transaction
        await tx.$executeRawUnsafe('SET LOCAL search_path TO schedule_schema, public, extensions;');
        
        // Thực hiện query với vector type
        return await tx.$queryRaw`
          SELECT 
            id,
            name,
            description,
            category,
            difficulty,
            duration,
            price,
            max_capacity,
            1 - (class_embedding <=> ${vectorString}::vector) as similarity
          FROM schedule_schema.gym_classes
          WHERE class_embedding IS NOT NULL
            AND is_active = true
          ORDER BY class_embedding <=> ${vectorString}::vector
          LIMIT ${k}
        `;
      });

      console.log(`[SUCCESS] [VectorSearchService] Found ${results.length} similar classes`);

      const mappedResults = results.map(row => ({
        id: row.id,
        name: row.name,
        description: row.description,
        category: row.category,
        difficulty: row.difficulty,
        duration: row.duration,
        price: row.price,
        max_capacity: row.max_capacity,
        similarity: parseFloat(row.similarity) || 0,
      }));

      if (mappedResults.length > 0) {
        console.log('[STATS] [VectorSearchService] Top 3 results:', mappedResults.slice(0, 3).map(r => ({
          name: r.name,
          category: r.category,
          similarity: r.similarity.toFixed(4),
        })));
      }

      return mappedResults;
    } catch (error) {
      console.error('[ERROR] Error in vector search:', {
        message: error.message,
        code: error.code,
        stack: error.stack,
      });
      // Fallback: return empty array nếu vector search fail
      return [];
    }
  }

  /**
   * Semantic search - Tìm kiếm classes dựa trên query text
   * @param {number[]} queryVector - Query vector embedding
   * @param {number} k - Số lượng kết quả
   * @returns {Promise<Array>} - Danh sách classes với similarity score
   */
  async semanticSearch(queryVector, k = 10) {
    try {
      const vectorString = '[' + queryVector.join(',') + ']';
      
      // Sử dụng transaction để đảm bảo search_path được set đúng
      const results = await prisma.$transaction(async (tx) => {
        // Set search_path trong transaction
        await tx.$executeRawUnsafe('SET LOCAL search_path TO schedule_schema, public, extensions;');
        
        // Thực hiện query với vector type
        return await tx.$queryRaw`
          SELECT 
            id,
            name,
            description,
            category,
            difficulty,
            duration,
            price,
            1 - (class_embedding <=> ${vectorString}::vector) as similarity
          FROM schedule_schema.gym_classes
          WHERE class_embedding IS NOT NULL
            AND is_active = true
          ORDER BY class_embedding <=> ${vectorString}::vector
          LIMIT ${k}
        `;
      });

      return results.map(row => ({
        id: row.id,
        name: row.name,
        description: row.description,
        category: row.category,
        difficulty: row.difficulty,
        duration: row.duration,
        price: row.price,
        similarity: parseFloat(row.similarity) || 0,
      }));
    } catch (error) {
      console.error('[ERROR] Error in semantic search:', error);
      return [];
    }
  }
}

module.exports = new VectorSearchService();

