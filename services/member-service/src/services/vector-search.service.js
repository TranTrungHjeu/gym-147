/**
 * Vector Search Service - Tìm kiếm dựa trên vector similarity
 * Sử dụng pgvector với HNSW index
 */

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

class VectorSearchService {
  /**
   * Tính cosine similarity giữa hai vector
   * @param {number[]} vec1 - Vector 1
   * @param {number[]} vec2 - Vector 2
   * @returns {number} - Cosine similarity [-1, 1]
   */
  cosineSimilarity(vec1, vec2) {
    if (!vec1 || !vec2 || vec1.length !== vec2.length) {
      throw new Error('Vectors must have the same length');
    }

    let dotProduct = 0;
    let norm1 = 0;
    let norm2 = 0;

    for (let i = 0; i < vec1.length; i++) {
      dotProduct += vec1[i] * vec2[i];
      norm1 += vec1[i] * vec1[i];
      norm2 += vec2[i] * vec2[i];
    }

    const denominator = Math.sqrt(norm1) * Math.sqrt(norm2);
    if (denominator === 0) return 0;

    return dotProduct / denominator;
  }

  /**
   * Vector search trong PostgreSQL sử dụng pgvector
   * Tìm top-K classes gần nhất với member vector
   * @param {string} memberVector - Vector embedding của member (PostgreSQL format)
   * @param {number} k - Số lượng kết quả (default: 50)
   * @returns {Promise<Array>} - Danh sách classes với similarity score
   */
  async searchSimilarClasses(memberVector, k = 50) {
    try {
      // Sử dụng raw query với pgvector cosine distance
      // 1 - cosine_distance = cosine_similarity
      const results = await prisma.$queryRaw`
        SELECT 
          id,
          name,
          description,
          category,
          difficulty,
          duration,
          price,
          class_embedding,
          1 - (class_embedding <=> ${memberVector}::vector) as similarity
        FROM gym_classes
        WHERE class_embedding IS NOT NULL
          AND is_active = true
        ORDER BY class_embedding <=> ${memberVector}::vector
        LIMIT ${k}
      `;

      return results.map(row => ({
        id: row.id,
        name: row.name,
        description: row.description,
        category: row.category,
        difficulty: row.difficulty,
        duration: row.duration,
        price: row.price,
        similarity: parseFloat(row.similarity),
      }));
    } catch (error) {
      console.error('❌ Error in vector search:', error);
      throw error;
    }
  }

  /**
   * Semantic search - Tìm kiếm classes dựa trên query text
   * @param {string} queryText - Query text từ user
   * @param {number[]} queryVector - Query vector embedding
   * @param {number} k - Số lượng kết quả
   * @returns {Promise<Array>} - Danh sách classes với similarity score
   */
  async semanticSearch(queryVector, k = 10) {
    try {
      const vectorString = '[' + queryVector.join(',') + ']';
      
      const results = await prisma.$queryRaw`
        SELECT 
          id,
          name,
          description,
          category,
          difficulty,
          duration,
          price,
          1 - (class_embedding <=> ${vectorString}::vector) as similarity
        FROM gym_classes
        WHERE class_embedding IS NOT NULL
          AND is_active = true
        ORDER BY class_embedding <=> ${vectorString}::vector
        LIMIT ${k}
      `;

      return results.map(row => ({
        id: row.id,
        name: row.name,
        description: row.description,
        category: row.category,
        difficulty: row.difficulty,
        duration: row.duration,
        price: row.price,
        similarity: parseFloat(row.similarity),
      }));
    } catch (error) {
      console.error('❌ Error in semantic search:', error);
      throw error;
    }
  }

  /**
   * Tìm members có profile tương tự (cho collaborative filtering)
   * @param {string} memberVector - Vector embedding của member
   * @param {number} k - Số lượng members tương tự
   * @returns {Promise<Array>} - Danh sách members với similarity score
   */
  async findSimilarMembers(memberVector, k = 10) {
    try {
      const results = await prisma.$queryRaw`
        SELECT 
          id,
          user_id,
          full_name,
          membership_type,
          fitness_goals,
          1 - (profile_embedding <=> ${memberVector}::vector) as similarity
        FROM members
        WHERE profile_embedding IS NOT NULL
          AND membership_status = 'ACTIVE'
        ORDER BY profile_embedding <=> ${memberVector}::vector
        LIMIT ${k}
      `;

      return results.map(row => ({
        id: row.id,
        user_id: row.user_id,
        full_name: row.full_name,
        membership_type: row.membership_type,
        fitness_goals: row.fitness_goals,
        similarity: parseFloat(row.similarity),
      }));
    } catch (error) {
      console.error('❌ Error finding similar members:', error);
      throw error;
    }
  }
}

module.exports = new VectorSearchService();

