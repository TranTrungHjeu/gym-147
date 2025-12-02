// Use the shared Prisma client from lib/prisma.js
const { prisma } = require('../lib/prisma');
const databaseCertificationService = require('./database-certification.service');

/**
 * Validate if a trainer can create a class for a specific category
 * @param {string} trainerId - Trainer ID
 * @param {Object} classData - Class data including category and required_certification_level
 * @returns {Object} - Validation result with valid boolean and errors array
 */
const validateClassCreation = async (trainerId, classData) => {
  try {
    const errors = [];
    const { category, required_certification_level = 'BASIC' } = classData;

    // Check if trainer exists
    const trainer = await prisma.trainer.findUnique({
      where: { id: trainerId },
    });

    if (!trainer) {
      errors.push('Trainer not found');
      return { valid: false, errors };
    }

    // Use database function to validate trainer certification
    const validation = await databaseCertificationService.validateTrainerCanTeach(
      trainerId,
      category,
      required_certification_level
    );

    if (!validation.canTeach) {
      errors.push(validation.reason);
      return { valid: false, errors };
    }

    // Add warning if certification is expiring soon
    if (validation.warning) {
      errors.push(validation.warning);
    }

    return {
      valid: true,
      errors,
      certification: {
        certification_level: validation.certificationLevel,
        certification_name: validation.certificationName,
        expiration_date: validation.expirationDate,
      },
    };
  } catch (error) {
    console.error('Error validating class creation:', error);
    return { valid: false, errors: ['Internal server error during validation'] };
  }
};

/**
 * Get available categories for a trainer (categories with valid certifications)
 * @param {string} trainerId - Trainer ID
 * @returns {Array} - Array of available categories
 */
const getAvailableCategories = async trainerId => {
  try {
    console.log('Getting available categories for trainer:', trainerId);

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
        expiration_date: true,
      },
    });

    console.log('Found certifications:', certifications);

    const result = certifications.map(cert => ({
      category: cert.category,
      level: cert.certification_level,
      expiration_date: cert.expiration_date,
    }));

    console.log('Available categories result:', result);
    return result;
  } catch (error) {
    console.error('Error getting available categories:', error);
    return [];
  }
};

/**
 * Check if trainer has access to a specific category
 * @param {string} trainerId - Trainer ID
 * @param {string} category - Category to check
 * @returns {Object} - Access result with hasAccess boolean and certification details
 */
const checkCategoryAccess = async (trainerId, category) => {
  try {
    const certification = await prisma.trainerCertification.findFirst({
      where: {
        trainer_id: trainerId,
        category: category,
        verification_status: 'VERIFIED',
        is_active: true,
        OR: [{ expiration_date: null }, { expiration_date: { gt: new Date() } }],
      },
    });

    return {
      hasAccess: !!certification,
      certification: certification,
    };
  } catch (error) {
    console.error('Error checking category access:', error);
    return { hasAccess: false, certification: null };
  }
};

/**
 * Get expiring certifications for a trainer
 * @param {string} trainerId - Trainer ID
 * @param {number} days - Number of days to check ahead (default: 30)
 * @returns {Array} - Array of expiring certifications
 */
const getExpiringCertifications = async (trainerId, days = 30) => {
  try {
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + days);

    const certifications = await prisma.trainerCertification.findMany({
      where: {
        trainer_id: trainerId,
        verification_status: 'VERIFIED',
        is_active: true,
        expiration_date: {
          lte: futureDate,
          gt: new Date(),
        },
      },
    });

    return certifications;
  } catch (error) {
    console.error('Error getting expiring certifications:', error);
    return [];
  }
};

/**
 * Auto-expire certifications that have passed their expiration date
 * @returns {number} - Number of certifications expired
 */
const autoExpireCertifications = async () => {
  try {
    const result = await prisma.trainerCertification.updateMany({
      where: {
        verification_status: 'VERIFIED',
        is_active: true,
        expiration_date: {
          lt: new Date(),
        },
      },
      data: {
        verification_status: 'EXPIRED',
      },
    });

    console.log(`Auto-expired ${result.count} certifications`);
    return result.count;
  } catch (error) {
    console.error('Error auto-expiring certifications:', error);
    return 0;
  }
};

module.exports = {
  validateClassCreation,
  getAvailableCategories,
  checkCategoryAccess,
  getExpiringCertifications,
  autoExpireCertifications,
};
