const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const notificationService = require('./notification.service.js');

/**
 * Certification Expiry Warning Service
 * Checks for certifications that are expiring soon and sends notifications
 */
class CertificationExpiryWarningService {
  /**
   * Check for certifications expiring within the specified days
   * @param {number} daysBeforeExpiry - Number of days before expiry to warn (default: 30)
   * @returns {Object} - Result of the check
   */
  async checkExpiringCertifications(daysBeforeExpiry = 30) {
    try {
      // Check if we're in test mode (reduce logging in production)
      const isTestMode = process.env.CERTIFICATION_EXPIRY_WARNING_INTERVAL_SECONDS;
      
      if (isTestMode) {
        console.log(`🔍 Checking for certifications expiring within ${daysBeforeExpiry} days...`);
      }

      const now = new Date();
      const warningDate = new Date();
      warningDate.setDate(warningDate.getDate() + daysBeforeExpiry);

      // Find all verified certifications that are expiring soon
      const expiringCerts = await prisma.trainerCertification.findMany({
        where: {
          verification_status: 'VERIFIED',
          is_active: true,
          expiration_date: {
            gte: now, // Not expired yet
            lte: warningDate, // Expiring within warning period
          },
        },
        include: {
          trainer: {
            select: {
              id: true,
              full_name: true,
              email: true,
              user_id: true,
            },
          },
        },
        orderBy: {
          expiration_date: 'asc', // Earliest expiration first
        },
      });

      // Only log if in test mode or if there are expiring certifications
      if (isTestMode || expiringCerts.length > 0) {
        console.log(`📋 Found ${expiringCerts.length} certification(s) expiring within ${daysBeforeExpiry} days`);
      }

      if (expiringCerts.length === 0) {
        return {
          success: true,
          expiringCount: 0,
          trainersNotified: 0,
          adminsNotified: 0,
          message: 'No certifications expiring soon',
        };
      }

      // Group by trainer to avoid duplicate notifications
      const trainerCertMap = {};
      expiringCerts.forEach(cert => {
        if (!trainerCertMap[cert.trainer_id]) {
          trainerCertMap[cert.trainer_id] = {
            trainer: cert.trainer,
            certifications: [],
          };
        }
        trainerCertMap[cert.trainer_id].certifications.push(cert);
      });

      let trainersNotified = 0;
      let adminsNotified = 0;

      // Send notifications to trainers
      for (const [trainerId, data] of Object.entries(trainerCertMap)) {
        try {
          // Calculate days until expiration for each certification
          const certsWithDays = data.certifications.map(cert => {
            const expirationDate = new Date(cert.expiration_date);
            const daysUntilExpiry = Math.ceil(
              (expirationDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
            );
            return {
              ...cert,
              daysUntilExpiry,
            };
          });

          // Send notification to trainer
          await notificationService.sendCertificationExpiringWarning({
            trainerId: data.trainer.id,
            trainerName: data.trainer.full_name,
            certifications: certsWithDays,
          });

          trainersNotified++;
          console.log(
            `✅ Sent expiry warning to trainer ${data.trainer.full_name} (${data.certifications.length} certification(s))`
          );
        } catch (error) {
          console.error(
            `❌ Error sending expiry warning to trainer ${data.trainer.full_name}:`,
            error
          );
        }
      }

      // Send summary notification to admins
      try {
        await notificationService.sendCertificationExpiringSummaryToAdmins({
          totalExpiring: expiringCerts.length,
          trainersAffected: Object.keys(trainerCertMap).length,
          certifications: expiringCerts.map(cert => ({
            id: cert.id,
            trainer_id: cert.trainer_id,
            trainer_name: cert.trainer.full_name,
            category: cert.category,
            certification_name: cert.certification_name,
            expiration_date: cert.expiration_date,
          })),
        });
        adminsNotified = 1; // One notification to all admins
        console.log(`✅ Sent expiry summary to admins`);
      } catch (error) {
        console.error('❌ Error sending expiry summary to admins:', error);
      }

      return {
        success: true,
        expiringCount: expiringCerts.length,
        trainersNotified,
        adminsNotified,
        trainersAffected: Object.keys(trainerCertMap).length,
        message: `Checked ${expiringCerts.length} expiring certification(s), notified ${trainersNotified} trainer(s) and admins`,
      };
    } catch (error) {
      console.error('❌ Error checking expiring certifications:', error);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Check for certifications that have already expired
   * This can be used for a separate cron job to handle expired certifications
   * @returns {Object} - Result of the check
   */
  async checkExpiredCertifications() {
    try {
      console.log('🔍 Checking for expired certifications...');

      const now = new Date();

      // Find all verified certifications that have expired
      const expiredCerts = await prisma.trainerCertification.findMany({
        where: {
          verification_status: 'VERIFIED',
          is_active: true,
          expiration_date: {
            lte: now, // Expired
          },
        },
        include: {
          trainer: {
            select: {
              id: true,
              full_name: true,
              email: true,
              user_id: true,
            },
          },
        },
        orderBy: {
          expiration_date: 'desc',
        },
      });

      console.log(`📋 Found ${expiredCerts.length} expired certification(s)`);

      if (expiredCerts.length === 0) {
        return {
          success: true,
          expiredCount: 0,
          message: 'No expired certifications found',
        };
      }

      // Group by trainer and category
      const trainerCategoryMap = {};
      expiredCerts.forEach(cert => {
        const key = `${cert.trainer_id}_${cert.category}`;
        if (!trainerCategoryMap[key]) {
          trainerCategoryMap[key] = {
            trainer: cert.trainer,
            category: cert.category,
            certifications: [],
          };
        }
        trainerCategoryMap[key].certifications.push(cert);
      });

      // Send notifications to trainers about expired certifications
      let trainersNotified = 0;
      for (const [key, data] of Object.entries(trainerCategoryMap)) {
        try {
          await notificationService.sendCertificationExpiredNotification({
            trainerId: data.trainer.id,
            trainerName: data.trainer.full_name,
            category: data.category,
            certifications: data.certifications,
          });
          trainersNotified++;
          console.log(
            `✅ Sent expired certification notification to trainer ${data.trainer.full_name} for category ${data.category}`
          );
        } catch (error) {
          console.error(
            `❌ Error sending expired certification notification to trainer ${data.trainer.full_name}:`,
            error
          );
        }
      }

      return {
        success: true,
        expiredCount: expiredCerts.length,
        trainersNotified,
        trainersAffected: Object.keys(trainerCategoryMap).length,
        message: `Found ${expiredCerts.length} expired certification(s), notified ${trainersNotified} trainer(s)`,
      };
    } catch (error) {
      console.error('❌ Error checking expired certifications:', error);
      return {
        success: false,
        error: error.message,
      };
    }
  }
}

module.exports = new CertificationExpiryWarningService();

