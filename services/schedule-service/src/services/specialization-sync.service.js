const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

/**
 * Specialization Sync Service
 * Manages synchronization between trainer certifications and specializations
 */

class SpecializationSyncService {
  /**
   * Update trainer specializations based on their verified certifications
   * @param {string} trainerId - Trainer ID
   * @returns {Object} - Update result
   */
  async updateTrainerSpecializations(trainerId) {
    try {
      console.log(`🔄 Syncing specializations for trainer: ${trainerId}`);

      // Verify trainer exists first
      const trainer = await prisma.trainer.findUnique({
        where: { id: trainerId },
        select: { id: true, full_name: true, specializations: true },
      });

      if (!trainer) {
        console.error(`❌ Trainer not found: ${trainerId}`);
        return {
          success: false,
          error: `Trainer not found: ${trainerId}`,
        };
      }

      console.log(`✅ Trainer found: ${trainer.full_name} (${trainerId})`);
      console.log(`📊 Current specializations:`, trainer.specializations || []);

      // Get ALL verified certifications first (including expired ones) for logging
      const allVerifiedCerts = await prisma.trainerCertification.findMany({
        where: {
          trainer_id: trainerId,
          verification_status: 'VERIFIED',
          is_active: true,
        },
        select: {
          id: true,
          category: true,
          certification_level: true,
          certification_name: true,
          expiration_date: true,
          verified_at: true,
        },
      });

      console.log(`📋 Found ${allVerifiedCerts.length} total verified certifications for trainer ${trainer.full_name}`);
      if (allVerifiedCerts.length > 0) {
        const now = new Date();
        allVerifiedCerts.forEach(cert => {
          const isExpired = cert.expiration_date && new Date(cert.expiration_date) < now;
          const status = isExpired ? '❌ EXPIRED' : '✅ ACTIVE';
          console.log(
            `   ${status} - ${cert.category} (${cert.certification_level})${cert.expiration_date ? ` - Expires: ${cert.expiration_date.toISOString().split('T')[0]}` : ' - No expiration'}`
          );
        });
      }

      // Get only non-expired verified certifications for sync
      const certifications = await prisma.trainerCertification.findMany({
        where: {
          trainer_id: trainerId,
          verification_status: 'VERIFIED',
          is_active: true,
          OR: [{ expiration_date: null }, { expiration_date: { gt: new Date() } }],
        },
        select: {
          category: true,
          certification_level: true,
          certification_name: true,
          expiration_date: true,
        },
      });

      console.log(`✅ Found ${certifications.length} non-expired verified certifications eligible for specialization sync`);
      if (certifications.length !== allVerifiedCerts.length) {
        const expiredCount = allVerifiedCerts.length - certifications.length;
        console.log(`⚠️  ${expiredCount} certification(s) excluded due to expiration`);
      }

      // Extract unique categories and get the highest level for each
      const categoryLevels = {};
      certifications.forEach(cert => {
        const levelHierarchy = {
          BASIC: 1,
          INTERMEDIATE: 2,
          ADVANCED: 3,
          EXPERT: 4,
        };

        const currentLevel = levelHierarchy[cert.certification_level] || 0;
        const existingLevel =
          levelHierarchy[categoryLevels[cert.category]?.certification_level] || 0;

        if (currentLevel > existingLevel) {
          categoryLevels[cert.category] = {
            category: cert.category,
            certification_level: cert.certification_level,
            certification_name: cert.certification_name,
          };
        }
      });

      const specializations = Object.values(categoryLevels);
      
      if (specializations.length === 0) {
        console.log(`⚠️  No valid certifications found to sync - specializations will be empty array`);
        console.log(`   This could be because:`);
        console.log(`   - All certifications have expired`);
        console.log(`   - No certifications are VERIFIED`);
        console.log(`   - No certifications are active`);
      } else {
        console.log(
          `🎯 Specializations to sync:`,
          specializations.map(s => `${s.category} (${s.certification_level})`)
        );
      }

      // Update trainer specializations
      const updatedTrainer = await prisma.trainer.update({
        where: { id: trainerId },
        data: {
          specializations: specializations.map(s => s.category),
        },
        select: {
          id: true,
          full_name: true,
          specializations: true,
        },
      });

      console.log(`✅ Specializations updated for trainer ${updatedTrainer.full_name}`);
      console.log(`📊 Before sync: ${trainer.specializations?.length || 0} specializations -`, trainer.specializations || []);
      console.log(`📊 After sync: ${updatedTrainer.specializations.length} specializations -`, updatedTrainer.specializations);

      return {
        success: true,
        trainerId,
        specializations: updatedTrainer.specializations,
        certificationDetails: specializations,
        totalCertifications: allVerifiedCerts.length,
        eligibleCertifications: certifications.length,
        expiredCertifications: allVerifiedCerts.length - certifications.length,
      };
    } catch (error) {
      console.error('❌ Error updating trainer specializations:', error);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Get trainer's current specializations with certification details
   * @param {string} trainerId - Trainer ID
   * @returns {Object} - Specializations with details
   */
  async getTrainerSpecializationsWithDetails(trainerId) {
    try {
      // Get trainer info
      const trainer = await prisma.trainer.findUnique({
        where: { id: trainerId },
        select: {
          id: true,
          full_name: true,
          specializations: true,
        },
      });

      if (!trainer) {
        return {
          success: false,
          error: 'Trainer not found',
        };
      }

      // Get certification details for each specialization
      const certificationDetails = await prisma.trainerCertification.findMany({
        where: {
          trainer_id: trainerId,
          category: { in: trainer.specializations },
          verification_status: 'VERIFIED',
          is_active: true,
          OR: [{ expiration_date: null }, { expiration_date: { gt: new Date() } }],
        },
        select: {
          category: true,
          certification_level: true,
          certification_name: true,
          certification_issuer: true,
          issued_date: true,
          expiration_date: true,
          verified_at: true,
        },
        orderBy: [{ category: 'asc' }, { certification_level: 'desc' }],
      });

      // Group by category and get highest level
      const specializationsWithDetails = {};
      certificationDetails.forEach(cert => {
        if (
          !specializationsWithDetails[cert.category] ||
          this.getLevelValue(cert.certification_level) >
            this.getLevelValue(specializationsWithDetails[cert.category].certification_level)
        ) {
          specializationsWithDetails[cert.category] = cert;
        }
      });

      return {
        success: true,
        trainer: {
          id: trainer.id,
          full_name: trainer.full_name,
          specializations: trainer.specializations,
        },
        specializationsWithDetails: Object.values(specializationsWithDetails),
      };
    } catch (error) {
      console.error('❌ Error getting trainer specializations with details:', error);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Validate if trainer can teach a specific category
   * @param {string} trainerId - Trainer ID
   * @param {string} category - Class category
   * @param {string} requiredLevel - Required certification level (optional)
   * @returns {Object} - Validation result
   */
  async validateTrainerCanTeach(trainerId, category, requiredLevel = 'BASIC') {
    try {
      // Get trainer's highest certification for this category
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

      if (!certification) {
        return {
          canTeach: false,
          reason: `No verified certification found for ${category}`,
          requiredCertification: category,
        };
      }

      // Check if certification level meets requirement
      const trainerLevel = this.getLevelValue(certification.certification_level);
      const requiredLevelValue = this.getLevelValue(requiredLevel);

      if (trainerLevel < requiredLevelValue) {
        return {
          canTeach: false,
          reason: `Certification level ${certification.certification_level} is insufficient for ${requiredLevel} level classes`,
          currentLevel: certification.certification_level,
          requiredLevel: requiredLevel,
        };
      }

      // Check if certification is expiring soon (within 30 days)
      let warning = null;
      if (certification.expiration_date) {
        const thirtyDaysFromNow = new Date();
        thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);

        if (certification.expiration_date <= thirtyDaysFromNow) {
          warning = `Certification expires on ${certification.expiration_date.toDateString()}`;
        }
      }

      return {
        canTeach: true,
        certificationLevel: certification.certification_level,
        certificationName: certification.certification_name,
        expirationDate: certification.expiration_date,
        warning,
      };
    } catch (error) {
      console.error('❌ Error validating trainer can teach:', error);
      return {
        canTeach: false,
        reason: 'Error validating certification',
        error: error.message,
      };
    }
  }

  /**
   * Get all trainers who can teach a specific category
   * @param {string} category - Class category
   * @param {string} requiredLevel - Required certification level (optional)
   * @returns {Object} - List of qualified trainers
   */
  async getQualifiedTrainers(category, requiredLevel = 'BASIC') {
    try {
      const trainers = await prisma.trainer.findMany({
        where: {
          specializations: { has: category },
          status: 'ACTIVE',
        },
        select: {
          id: true,
          full_name: true,
          email: true,
          specializations: true,
          rating_average: true,
          total_classes: true,
        },
      });

      // Validate each trainer's certification level
      const qualifiedTrainers = [];
      for (const trainer of trainers) {
        const validation = await this.validateTrainerCanTeach(trainer.id, category, requiredLevel);
        if (validation.canTeach) {
          qualifiedTrainers.push({
            ...trainer,
            certificationLevel: validation.certificationLevel,
            certificationName: validation.certificationName,
            warning: validation.warning,
          });
        }
      }

      return {
        success: true,
        category,
        requiredLevel,
        qualifiedTrainers,
      };
    } catch (error) {
      console.error('❌ Error getting qualified trainers:', error);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Sync all trainers' specializations (useful for migration or bulk update)
   * @returns {Object} - Sync result
   */
  async syncAllTrainersSpecializations() {
    try {
      console.log('🔄 Starting bulk sync of all trainers specializations...');

      const trainers = await prisma.trainer.findMany({
        select: { id: true, full_name: true },
      });

      const results = [];
      for (const trainer of trainers) {
        const result = await this.updateTrainerSpecializations(trainer.id);
        results.push({
          trainerId: trainer.id,
          trainerName: trainer.full_name,
          success: result.success,
          specializations: result.specializations || [],
          error: result.error,
        });
      }

      const successCount = results.filter(r => r.success).length;
      const failureCount = results.filter(r => !r.success).length;

      console.log(`✅ Bulk sync completed: ${successCount} success, ${failureCount} failures`);

      return {
        success: true,
        totalTrainers: trainers.length,
        successCount,
        failureCount,
        results,
      };
    } catch (error) {
      console.error('❌ Error in bulk sync:', error);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Get numeric value for certification level
   * @param {string} level - Certification level
   * @returns {number} - Numeric value
   */
  getLevelValue(level) {
    const levelHierarchy = {
      BASIC: 1,
      INTERMEDIATE: 2,
      ADVANCED: 3,
      EXPERT: 4,
    };
    return levelHierarchy[level] || 0;
  }
}

module.exports = new SpecializationSyncService();
