// Use the shared Prisma client from lib/prisma.js
const { prisma } = require('../lib/prisma');

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
      console.log(`[SYNC] Syncing specializations for trainer: ${trainerId}`);

      // Verify trainer exists first
      const trainer = await prisma.trainer.findUnique({
        where: { id: trainerId },
        select: { id: true, full_name: true, specializations: true },
      });

      if (!trainer) {
        console.error(`[ERROR] Trainer not found: ${trainerId}`);
        return {
          success: false,
          error: `Trainer not found: ${trainerId}`,
        };
      }

      console.log(`[SUCCESS] Trainer found: ${trainer.full_name} (${trainerId})`);
      console.log(`[DATA] Current specializations:`, trainer.specializations || []);

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

      console.log(`[DATA] Found ${allVerifiedCerts.length} total verified certifications for trainer ${trainer.full_name}`);
      if (allVerifiedCerts.length > 0) {
        const now = new Date();
        allVerifiedCerts.forEach(cert => {
          const isExpired = cert.expiration_date && new Date(cert.expiration_date) < now;
          const status = isExpired ? '[ERROR] EXPIRED' : '[SUCCESS] ACTIVE';
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

      console.log(`[SUCCESS] Found ${certifications.length} non-expired verified certifications eligible for specialization sync`);
      if (certifications.length !== allVerifiedCerts.length) {
        const expiredCount = allVerifiedCerts.length - certifications.length;
        console.log(`[WARN] ${expiredCount} certification(s) excluded due to expiration`);
      }

      // Extract unique categories and get the highest level for each
      // If same level, prefer certification with later expiration_date
      const categoryLevels = {};
      certifications.forEach(cert => {
        const levelHierarchy = {
          BASIC: 1,
          INTERMEDIATE: 2,
          ADVANCED: 3,
          EXPERT: 4,
        };

        const currentLevel = levelHierarchy[cert.certification_level] || 0;
        const existing = categoryLevels[cert.category];
        const existingLevel = existing
          ? levelHierarchy[existing.certification_level] || 0
          : 0;

        if (currentLevel > existingLevel) {
          // Higher level: always choose this one
          categoryLevels[cert.category] = {
            category: cert.category,
            certification_level: cert.certification_level,
            certification_name: cert.certification_name,
          };
        } else if (currentLevel === existingLevel && existing) {
          // Same level: choose based on expiration_date
          const existingExp = existing.expiration_date
            ? new Date(existing.expiration_date)
            : null;
          const currentExp = cert.expiration_date ? new Date(cert.expiration_date) : null;

          let shouldReplace = false;

          if (!currentExp && existingExp) {
            // Current has no expiration, prefer it
            shouldReplace = true;
          } else if (currentExp && existingExp && currentExp > existingExp) {
            // Current expires later, prefer it
            shouldReplace = true;
          } else if (currentExp && !existingExp) {
            // Existing has no expiration, keep existing
            shouldReplace = false;
          } else {
            // Both have same expiration or both have no expiration
            // Keep existing (first one found)
            shouldReplace = false;
          }

          if (shouldReplace) {
            categoryLevels[cert.category] = {
              category: cert.category,
              certification_level: cert.certification_level,
              certification_name: cert.certification_name,
            };
          }
        } else if (!existing) {
          // No existing certification for this category
          categoryLevels[cert.category] = {
            category: cert.category,
            certification_level: cert.certification_level,
            certification_name: cert.certification_name,
          };
        }
      });

      const newSpecializations = Object.values(categoryLevels).map(s => s.category);
      
      // Compare with current specializations
      const currentSpecs = trainer.specializations || [];
      const specsChanged = JSON.stringify(currentSpecs.sort()) !== JSON.stringify(newSpecializations.sort());
      
      if (newSpecializations.length === 0) {
        console.log(`[WARN] WARNING: No valid certifications found for trainer ${trainer.full_name} (${trainerId})`);
        console.log(`   Current specializations: ${currentSpecs.length > 0 ? currentSpecs.join(', ') : 'NONE'}`);
        console.log(`   This could be because:`);
        console.log(`   - All certifications have expired`);
        console.log(`   - No certifications are VERIFIED`);
        console.log(`   - No certifications are active`);
        console.log(`   [WARN] SPECIALIZATIONS WILL BE CLEARED (set to empty array)`);
        
        // Only update if there's a change to avoid unnecessary database writes
        if (currentSpecs.length > 0) {
          console.log(`   [WARN] This will REMOVE ${currentSpecs.length} specialization(s): ${currentSpecs.join(', ')}`);
        }
      } else {
        console.log(
          `[SYNC] Specializations to sync:`,
          newSpecializations.map(cat => {
            const cert = categoryLevels[cat];
            return `${cat} (${cert.certification_level})`;
          })
        );
        
        if (specsChanged) {
          const added = newSpecializations.filter(s => !currentSpecs.includes(s));
          const removed = currentSpecs.filter(s => !newSpecializations.includes(s));
          
          if (added.length > 0) {
            console.log(`   [ADD] Added: ${added.join(', ')}`);
          }
          if (removed.length > 0) {
            console.log(`   [REMOVE] Removed: ${removed.join(', ')}`);
          }
        } else {
          console.log(`   [INFO] No changes detected - specializations unchanged`);
        }
      }

      // Only update if specializations actually changed
      let updatedTrainer;
      if (specsChanged) {
        updatedTrainer = await prisma.trainer.update({
          where: { id: trainerId },
          data: {
            specializations: newSpecializations,
          },
          select: {
            id: true,
            full_name: true,
            specializations: true,
          },
        });

        console.log(`[SUCCESS] Specializations updated for trainer ${updatedTrainer.full_name}`);
        console.log(`[DATA] Before: ${currentSpecs.length} specializations - [${currentSpecs.join(', ')}]`);
        console.log(`[DATA] After: ${updatedTrainer.specializations.length} specializations - [${updatedTrainer.specializations.join(', ')}]`);
      } else {
        console.log(`[INFO] No update needed - specializations unchanged for trainer ${trainer.full_name}`);
        updatedTrainer = trainer;
      }

      return {
        success: true,
        trainerId,
        specializations: updatedTrainer.specializations,
        certificationDetails: Object.values(categoryLevels),
        totalCertifications: allVerifiedCerts.length,
        eligibleCertifications: certifications.length,
        expiredCertifications: allVerifiedCerts.length - certifications.length,
        changed: specsChanged,
        before: currentSpecs,
        after: newSpecializations,
      };
    } catch (error) {
      console.error('[ERROR] Error updating trainer specializations:', error);
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
      console.error('[ERROR] Error getting trainer specializations with details:', error);
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
      console.error('[ERROR] Error validating trainer can teach:', error);
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
      console.error('[ERROR] Error getting qualified trainers:', error);
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
      console.log('[SYNC] Starting bulk sync of all trainers specializations...');

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

      console.log(`[SUCCESS] Bulk sync completed: ${successCount} success, ${failureCount} failures`);

      return {
        success: true,
        totalTrainers: trainers.length,
        successCount,
        failureCount,
        results,
      };
    } catch (error) {
      console.error('[ERROR] Error in bulk sync:', error);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Remove a specific specialization from trainer (when certification is deleted)
   * Only removes if there are no other valid certifications for that category
   * @param {string} trainerId - Trainer ID
   * @param {string} category - Category to remove
   * @returns {Object} - Update result
   */
  /**
   * Remove specialization from trainer
   * @param {string} trainerId - Trainer ID
   * @param {string} category - Category to remove
   * @param {string} excludeCertificationId - Optional: Certification ID to exclude from check (when deleting a certification)
   */
  async removeSpecialization(trainerId, category, excludeCertificationId = null) {
    try {
      console.log(`[DELETE] Removing specialization ${category} from trainer: ${trainerId}${excludeCertificationId ? ` (excluding cert ${excludeCertificationId})` : ''}`);

      // Verify trainer exists
      const trainer = await prisma.trainer.findUnique({
        where: { id: trainerId },
        select: { id: true, full_name: true, specializations: true },
      });

      if (!trainer) {
        console.error(`[ERROR] Trainer not found: ${trainerId}`);
        return {
          success: false,
          error: `Trainer not found: ${trainerId}`,
        };
      }

      console.log(`[SUCCESS] Trainer found: ${trainer.full_name} (${trainerId})`);
      console.log(`[DATA] Current specializations:`, trainer.specializations || []);

      // Check if trainer has this specialization
      const currentSpecs = trainer.specializations || [];
      if (!currentSpecs.includes(category)) {
        console.log(`[INFO] Trainer ${trainer.full_name} does not have specialization ${category} - no action needed`);
        return {
          success: true,
          trainerId,
          specializations: currentSpecs,
          message: `Specialization ${category} not found in trainer's specializations`,
          removed: false,
        };
      }

      // Check if there are other valid certifications for this category
      // Exclude the certification being deleted if provided
      const whereClause = {
        trainer_id: trainerId,
        category: category,
        verification_status: 'VERIFIED',
        OR: [{ expiration_date: null }, { expiration_date: { gt: new Date() } }],
      };
      
      if (excludeCertificationId) {
        whereClause.id = { not: excludeCertificationId };
      }

      const otherCerts = await prisma.trainerCertification.findMany({
        where: whereClause,
        select: {
          id: true,
          category: true,
          certification_level: true,
        },
      });

      if (otherCerts.length > 0) {
        console.log(`[INFO] Trainer ${trainer.full_name} still has ${otherCerts.length} valid certification(s) for ${category} - keeping specialization`);
        console.log(`   Certifications:`, otherCerts.map(c => `${c.category} (${c.certification_level})`));
        return {
          success: true,
          trainerId,
          specializations: currentSpecs,
          message: `Specialization ${category} kept - trainer still has valid certifications`,
          removed: false,
          remainingCertifications: otherCerts.length,
        };
      }

      // Remove the specialization
      const updatedSpecs = currentSpecs.filter(spec => spec !== category);
      
      const updatedTrainer = await prisma.trainer.update({
        where: { id: trainerId },
        data: {
          specializations: updatedSpecs,
        },
        select: {
          id: true,
          full_name: true,
          specializations: true,
        },
      });

      console.log(`[SUCCESS] Removed specialization ${category} from trainer ${updatedTrainer.full_name}`);
      console.log(`[DATA] Before: ${currentSpecs.length} specializations - [${currentSpecs.join(', ')}]`);
      console.log(`[DATA] After: ${updatedTrainer.specializations.length} specializations - [${updatedTrainer.specializations.join(', ')}]`);

      return {
        success: true,
        trainerId,
        specializations: updatedTrainer.specializations,
        removedCategory: category,
        removed: true,
        before: currentSpecs,
        after: updatedSpecs,
      };
    } catch (error) {
      console.error('[ERROR] Error removing specialization:', error);
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
