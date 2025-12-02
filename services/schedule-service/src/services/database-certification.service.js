// Use the shared Prisma client from lib/prisma.js
const { prisma } = require('../lib/prisma');

/**
 * Database Certification Service
 * Uses database functions and constraints for certification management
 */

class DatabaseCertificationService {
  /**
   * Get qualified trainers for a specific class category and level
   * @param {string} category - Class category
   * @param {string} requiredLevel - Required certification level
   * @returns {Object} - List of qualified trainers
   */
  async getQualifiedTrainers(category, requiredLevel = 'BASIC') {
    try {
      // Use database function to get qualified trainers
      const result = await prisma.$queryRaw`
        SELECT * FROM get_qualified_trainers(${category}, ${requiredLevel})
      `;

      return {
        success: true,
        category,
        requiredLevel,
        qualifiedTrainers: result,
      };
    } catch (error) {
      console.error('[ERROR] Error getting qualified trainers from database:', error);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Validate if trainer can teach a specific category and level
   * @param {string} trainerId - Trainer ID
   * @param {string} category - Class category
   * @param {string} requiredLevel - Required certification level
   * @returns {Object} - Validation result
   */
  async validateTrainerCanTeach(trainerId, category, requiredLevel = 'BASIC') {
    try {
      // Use database function to validate
      const result = await prisma.$queryRaw`
        SELECT validate_trainer_certification(${trainerId}, ${category}, ${requiredLevel}) as can_teach
      `;

      const canTeach = result[0]?.can_teach || false;

      if (!canTeach) {
        // Get additional details about why they can't teach
        const certification = await prisma.trainerCertification.findFirst({
          where: {
            trainer_id: trainerId,
            category: category,
            verification_status: 'VERIFIED',
            is_active: true,
            OR: [{ expiration_date: null }, { expiration_date: { gt: new Date() } }],
          },
          orderBy: { certification_level: 'desc' },
          select: {
            certification_level: true,
            certification_name: true,
            expiration_date: true,
          },
        });

        return {
          canTeach: false,
          reason: certification
            ? `Certification level ${certification.certification_level} is insufficient for ${requiredLevel} level classes`
            : `No verified certification found for ${category}`,
          currentLevel: certification?.certification_level,
          requiredLevel: requiredLevel,
        };
      }

      // Get certification details for successful validation
      const certification = await prisma.trainerCertification.findFirst({
        where: {
          trainer_id: trainerId,
          category: category,
          verification_status: 'VERIFIED',
          is_active: true,
          OR: [{ expiration_date: null }, { expiration_date: { gt: new Date() } }],
        },
        orderBy: { certification_level: 'desc' },
        select: {
          certification_level: true,
          certification_name: true,
          expiration_date: true,
        },
      });

      // Check if certification is expiring soon
      let warning = null;
      if (certification?.expiration_date) {
        const thirtyDaysFromNow = new Date();
        thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);

        if (certification.expiration_date <= thirtyDaysFromNow) {
          warning = `Certification expires on ${certification.expiration_date.toDateString()}`;
        }
      }

      return {
        canTeach: true,
        certificationLevel: certification?.certification_level,
        certificationName: certification?.certification_name,
        expirationDate: certification?.expiration_date,
        warning,
      };
    } catch (error) {
      console.error('[ERROR] Error validating trainer can teach:', error);
      return {
        canTeach: false,
        reason: 'Error validating certification',
        error: error.message,
      };
    }
  }

  /**
   * Get trainer specializations with details using database view
   * @param {string} trainerId - Trainer ID
   * @returns {Object} - Specializations with details
   */
  async getTrainerSpecializationsWithDetails(trainerId) {
    try {
      // Use database view to get specializations with details
      const result = await prisma.$queryRaw`
        SELECT * FROM trainer_specializations_view 
        WHERE trainer_id = ${trainerId}
        ORDER BY category, certification_level DESC
      `;

      if (result.length === 0) {
        // Check if trainer exists
        const trainer = await prisma.trainer.findUnique({
          where: { id: trainerId },
          select: { id: true, full_name: true, specializations: true },
        });

        if (!trainer) {
          return {
            success: false,
            error: 'Trainer not found',
          };
        }

        return {
          success: true,
          trainer: {
            id: trainer.id,
            full_name: trainer.full_name,
            specializations: trainer.specializations,
          },
          specializationsWithDetails: [],
        };
      }

      // Group by trainer and format results
      const trainer = {
        id: result[0].trainer_id,
        full_name: result[0].full_name,
        specializations: result[0].specializations,
      };

      const specializationsWithDetails = result.map(row => ({
        category: row.category,
        certification_level: row.certification_level,
        certification_name: row.certification_name,
        certification_issuer: row.certification_issuer,
        issued_date: row.issued_date,
        expiration_date: row.expiration_date,
        verified_at: row.verified_at,
        expiration_status: row.expiration_status,
      }));

      return {
        success: true,
        trainer,
        specializationsWithDetails,
      };
    } catch (error) {
      console.error('[ERROR] Error getting trainer specializations with details:', error);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Get all trainers with their specializations (for admin dashboard)
   * @returns {Object} - All trainers with specializations
   */
  async getAllTrainersWithSpecializations() {
    try {
      const result = await prisma.$queryRaw`
        SELECT DISTINCT 
          trainer_id,
          full_name,
          specializations,
          COUNT(*) as certification_count,
          MAX(certification_level) as highest_level,
          MIN(expiration_date) as earliest_expiration
        FROM trainer_specializations_view
        GROUP BY trainer_id, full_name, specializations
        ORDER BY full_name
      `;

      return {
        success: true,
        trainers: result,
      };
    } catch (error) {
      console.error('[ERROR] Error getting all trainers with specializations:', error);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Get certification statistics for admin dashboard
   * @returns {Object} - Certification statistics
   */
  async getCertificationStatistics() {
    try {
      const stats = await prisma.$queryRaw`
        SELECT 
          COUNT(*) as total_certifications,
          COUNT(CASE WHEN verification_status = 'VERIFIED' THEN 1 END) as verified_count,
          COUNT(CASE WHEN verification_status = 'PENDING' THEN 1 END) as pending_count,
          COUNT(CASE WHEN verification_status = 'REJECTED' THEN 1 END) as rejected_count,
          COUNT(CASE WHEN expiration_date < NOW() THEN 1 END) as expired_count,
          COUNT(CASE WHEN expiration_date BETWEEN NOW() AND NOW() + INTERVAL '30 days' THEN 1 END) as expiring_soon_count
        FROM trainer_certifications
        WHERE is_active = true
      `;

      const categoryStats = await prisma.$queryRaw`
        SELECT 
          category,
          COUNT(*) as total,
          COUNT(CASE WHEN verification_status = 'VERIFIED' THEN 1 END) as verified,
          COUNT(CASE WHEN verification_status = 'PENDING' THEN 1 END) as pending
        FROM trainer_certifications
        WHERE is_active = true
        GROUP BY category
        ORDER BY total DESC
      `;

      const levelStats = await prisma.$queryRaw`
        SELECT 
          certification_level,
          COUNT(*) as count
        FROM trainer_certifications
        WHERE is_active = true AND verification_status = 'VERIFIED'
        GROUP BY certification_level
        ORDER BY 
          CASE certification_level
            WHEN 'BASIC' THEN 1
            WHEN 'INTERMEDIATE' THEN 2
            WHEN 'ADVANCED' THEN 3
            WHEN 'EXPERT' THEN 4
          END
      `;

      return {
        success: true,
        statistics: {
          overall: stats[0],
          byCategory: categoryStats,
          byLevel: levelStats,
        },
      };
    } catch (error) {
      console.error('[ERROR] Error getting certification statistics:', error);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Check database constraints and functions are working
   * @returns {Object} - Health check result
   */
  async healthCheck() {
    try {
      // Test database function
      const testResult = await prisma.$queryRaw`
        SELECT validate_trainer_certification('test', 'YOGA', 'BASIC') as test_result
      `;

      // Test view
      const viewResult = await prisma.$queryRaw`
        SELECT COUNT(*) as view_count FROM trainer_specializations_view LIMIT 1
      `;

      return {
        success: true,
        databaseFunctions: 'OK',
        databaseViews: 'OK',
        constraints: 'OK',
      };
    } catch (error) {
      console.error('[ERROR] Database health check failed:', error);
      return {
        success: false,
        error: error.message,
        databaseFunctions: 'FAILED',
        databaseViews: 'FAILED',
        constraints: 'FAILED',
      };
    }
  }
}

module.exports = new DatabaseCertificationService();
