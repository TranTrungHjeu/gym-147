// Use the shared Prisma client from lib/prisma.js
const { prisma } = require('../lib/prisma');
const notificationService = require('../services/notification.service.js');

// ==================== ADMIN CERTIFICATION ENDPOINTS ====================

/**
 * Get all pending certifications for admin review
 */
const getPendingCertifications = async (req, res) => {
  try {
    const { page = 1, limit = 10, category, trainer_id } = req.query;
    const skip = (page - 1) * limit;

    const where = {
      verification_status: 'PENDING',
      is_active: true,
    };

    if (category) {
      where.category = category;
    }

    if (trainer_id) {
      where.trainer_id = trainer_id;
    }

    const [certifications, total] = await Promise.all([
      prisma.trainerCertification.findMany({
        where,
        include: {
          trainer: {
            select: {
              id: true,
              full_name: true,
              email: true,
              phone: true,
            },
          },
        },
        orderBy: {
          created_at: 'asc',
        },
        skip: parseInt(skip),
        take: parseInt(limit),
      }),
      prisma.trainerCertification.count({ where }),
    ]);

    res.json({
      success: true,
      data: {
        certifications,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / limit),
        },
      },
      message: 'Pending certifications retrieved successfully',
    });
  } catch (error) {
    console.error('Error getting pending certifications:', error);
    res.status(500).json({
      success: false,
      data: null,
      message: 'Internal server error',
    });
  }
};

/**
 * Verify a certification (approve)
 */
const verifyCertification = async (req, res) => {
  try {
    const { certId } = req.params;
    const { verified_by } = req.body;

    if (!verified_by) {
      return res.status(400).json({
        success: false,
        data: null,
        message: 'Admin user ID is required for verification',
      });
    }

    // Get certification before update to check category, level, and expiration
    const certBeforeUpdate = await prisma.trainerCertification.findUnique({
      where: { id: certId },
      select: {
        trainer_id: true,
        category: true,
        certification_level: true,
        certification_name: true,
        certification_issuer: true,
        expiration_date: true,
        verification_status: true,
      },
    });

    if (!certBeforeUpdate) {
      return res.status(404).json({
        success: false,
        data: null,
        message: 'Certification not found',
      });
    }

    const certification = await prisma.trainerCertification.update({
      where: { id: certId },
      data: {
        verification_status: 'VERIFIED',
        verified_by: verified_by,
        verified_at: new Date(),
        rejection_reason: null,
      },
      include: {
        trainer: {
          select: {
            id: true,
            full_name: true,
            email: true,
          },
        },
      },
    });

    // When a certification is verified, deactivate older VERIFIED certifications in the same category
    // that have lower level or same level but earlier expiration (only if new cert is better)
    try {
      const levelOrder = { BASIC: 1, INTERMEDIATE: 2, ADVANCED: 3, EXPERT: 4 };
      const newLevel = levelOrder[certification.certification_level];

      // Find all VERIFIED, active certifications in the same category (excluding the current one)
      const existingVerifiedCerts = await prisma.trainerCertification.findMany({
        where: {
          trainer_id: certification.trainer_id,
          category: certification.category,
          verification_status: 'VERIFIED',
          is_active: true,
          id: { not: certId }, // Exclude the current cert
        },
        select: {
          id: true,
          certification_level: true,
          certification_name: true,
          certification_issuer: true,
          expiration_date: true,
        },
      });

      // Determine which certs should be deactivated
      const certsToDeactivate = [];
      
      for (const existingCert of existingVerifiedCerts) {
        const existingLevel = levelOrder[existingCert.certification_level];
        
        // Case 1: Lower level - definitely deactivate
        if (existingLevel < newLevel) {
          certsToDeactivate.push(existingCert.id);
          console.log(
            `[DELETE]  Will deactivate cert ${existingCert.id} (${existingCert.certification_level}) - new cert has higher level (${certification.certification_level})`
          );
        }
        // Case 2: Same level
        else if (existingLevel === newLevel) {
          // Same name/issuer - upgrade, deactivate old
          if (
            existingCert.certification_name === certification.certification_name &&
            existingCert.certification_issuer === certification.certification_issuer
          ) {
            certsToDeactivate.push(existingCert.id);
            console.log(
              `[DELETE]  Will deactivate cert ${existingCert.id} - same name/issuer, upgrading to new cert`
            );
          }
          // Different name/issuer - check expiration date
          else {
            const existingExp = existingCert.expiration_date ? new Date(existingCert.expiration_date) : null;
            const newExp = certification.expiration_date ? new Date(certification.expiration_date) : null;
            
            if (newExp && existingExp && newExp > existingExp) {
              // New cert expires later - deactivate old
              certsToDeactivate.push(existingCert.id);
              console.log(
                `[DELETE]  Will deactivate cert ${existingCert.id} - new cert expires later (${newExp.toISOString()} vs ${existingExp.toISOString()})`
              );
            } else if (newExp && !existingExp) {
              // New cert has expiration, old doesn't - deactivate old (prefer cert with expiration)
              certsToDeactivate.push(existingCert.id);
              console.log(
                `[DELETE]  Will deactivate cert ${existingCert.id} - new cert has expiration date, old doesn't`
              );
            } else if (!newExp && existingExp) {
              // New cert has no expiration, old has - keep both (don't deactivate)
              console.log(
                `[INFO]  Keeping cert ${existingCert.id} - old cert has expiration date, new doesn't (both will be active)`
              );
            }
            // If both have no expiration or new expires earlier, keep both active
          }
        }
        // Case 3: Higher level - don't deactivate (should not happen as we reject higher levels)
      }

      // Deactivate the certs
      if (certsToDeactivate.length > 0) {
        await prisma.trainerCertification.updateMany({
          where: {
            id: { in: certsToDeactivate },
          },
          data: {
            is_active: false,
          },
        });
        console.log(
          `[SUCCESS] Deactivated ${certsToDeactivate.length} older certification(s) in category ${certification.category} after verifying new certification`
        );
      } else {
        console.log(
          `[INFO]  No older certifications to deactivate for category ${certification.category}`
        );
      }
    } catch (deactivateError) {
      console.error('[ERROR] Error deactivating older certifications:', deactivateError);
      // Don't fail the request if deactivation fails
    }

    // Auto-sync specializations when certification is verified
    try {
      const specializationSyncService = require('../services/specialization-sync.service.js');
      console.log(
        `[SYNC] Starting specialization sync for trainer ${certification.trainer_id} after admin verification`
      );
      const syncResult = await specializationSyncService.updateTrainerSpecializations(certification.trainer_id);
      if (syncResult && syncResult.success) {
        console.log(
          `[SUCCESS] Auto-synced specializations for trainer ${certification.trainer_id} after admin verification`
        );
        console.log(`[LIST] Updated specializations:`, syncResult.specializations);
      } else {
        console.error(
          `[ERROR] Specialization sync returned failure for trainer ${certification.trainer_id}:`,
          syncResult?.error || 'Unknown error'
        );
      }
    } catch (syncError) {
      console.error('[ERROR] Error auto-syncing specializations:', syncError);
      console.error('[ERROR] Sync error stack:', syncError.stack);
      // Don't fail the request if sync fails, but log it for debugging
    }

    // Send notification to trainer about approval
    await notificationService.notifyCertificationStatusChange(
      certification.trainer_id,
      certId,
      'VERIFIED',
      verified_by
    );

    // Emit socket event to all admins to reload trainer list (specializations may have changed)
    if (global.io) {
      try {
        const admins = await notificationService.getAdminsAndSuperAdmins();
        admins.forEach(admin => {
          const roomName = `user:${admin.user_id}`;
          global.io.to(roomName).emit('certification:verified', {
            certification_id: certId,
            trainer_id: certification.trainer_id,
            trainer_name: certification.trainer.full_name,
            category: certification.category,
            verification_status: 'VERIFIED',
            verified_by: verified_by,
          });
        });
        console.log(`[EMIT] Emitted certification:verified event to ${admins.length} admin(s) for trainer list reload`);
      } catch (error) {
        console.error('[ERROR] Error emitting certification:verified event to admins:', error);
      }
    }

    res.json({
      success: true,
      data: certification,
      message: 'Certification verified successfully',
    });
  } catch (error) {
    console.error('Error verifying certification:', error);
    res.status(500).json({
      success: false,
      data: null,
      message: 'Internal server error',
    });
  }
};

/**
 * Reject a certification
 */
const rejectCertification = async (req, res) => {
  try {
    const { certId } = req.params;
    const { verified_by, rejection_reason } = req.body;

    if (!verified_by || !rejection_reason) {
      return res.status(400).json({
        success: false,
        data: null,
        message: 'Admin user ID and rejection reason are required',
      });
    }

    // Get certification before update to check if it was VERIFIED
    const certBeforeUpdate = await prisma.trainerCertification.findUnique({
      where: { id: certId },
      select: { verification_status: true, category: true },
    });

    const certification = await prisma.trainerCertification.update({
      where: { id: certId },
      data: {
        verification_status: 'REJECTED',
        verified_by: verified_by,
        verified_at: new Date(),
        rejection_reason: rejection_reason,
      },
      include: {
        trainer: {
          select: {
            id: true,
            full_name: true,
            email: true,
          },
        },
      },
    });

    // If certification was VERIFIED before rejection, remove the specialization
    // (only if no other valid certifications exist for that category)
    if (certBeforeUpdate && certBeforeUpdate.verification_status === 'VERIFIED') {
      try {
        const specializationSyncService = require('../services/specialization-sync.service.js');
        console.log(
          `[SYNC] Removing specialization ${certification.category} from trainer ${certification.trainer_id} after rejecting verified certification`
        );
        const removeResult = await specializationSyncService.removeSpecialization(
          certification.trainer_id,
          certification.category
        );
        if (removeResult && removeResult.success) {
          if (removeResult.removed) {
            console.log(
              `[SUCCESS] Removed specialization ${certification.category} from trainer ${certification.trainer_id} after rejection`
            );
          } else {
            console.log(
              `[INFO]  Specialization ${certification.category} kept - trainer still has other valid certifications`
            );
          }
        }
      } catch (removeError) {
        console.error('[ERROR] Error removing specialization after rejection:', removeError);
      }
    }

    // Send notification to trainer about rejection
    await notificationService.notifyCertificationStatusChange(
      certification.trainer_id,
      certId,
      'REJECTED',
      verified_by,
      rejection_reason
    );

    // Emit socket event to all admins to reload trainer list (specializations may have changed)
    if (global.io) {
      try {
        const admins = await notificationService.getAdminsAndSuperAdmins();
        admins.forEach(admin => {
          const roomName = `user:${admin.user_id}`;
          global.io.to(roomName).emit('certification:rejected', {
            certification_id: certId,
            trainer_id: certification.trainer_id,
            trainer_name: certification.trainer.full_name,
            category: certification.category,
            verification_status: 'REJECTED',
            verified_by: verified_by,
          });
        });
        console.log(`[EMIT] Emitted certification:rejected event to ${admins.length} admin(s) for trainer list reload`);
      } catch (error) {
        console.error('[ERROR] Error emitting certification:rejected event to admins:', error);
      }
    }

    res.json({
      success: true,
      data: certification,
      message: 'Certification rejected successfully',
    });
  } catch (error) {
    console.error('Error rejecting certification:', error);
    res.status(500).json({
      success: false,
      data: null,
      message: 'Internal server error',
    });
  }
};

/**
 * Get all certifications with filters
 */
const getAllCertifications = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 10,
      category,
      trainer_id,
      verification_status,
      certification_level,
    } = req.query;
    const skip = (page - 1) * limit;

    const where = {
      is_active: true,
    };

    if (category) {
      where.category = category;
    }

    if (trainer_id) {
      where.trainer_id = trainer_id;
    }

    if (verification_status) {
      where.verification_status = verification_status;
    }

    if (certification_level) {
      where.certification_level = certification_level;
    }

    const [certifications, total] = await Promise.all([
      prisma.trainerCertification.findMany({
        where,
        include: {
          trainer: {
            select: {
              id: true,
              full_name: true,
              email: true,
              phone: true,
            },
          },
        },
        orderBy: {
          created_at: 'desc',
        },
        skip: parseInt(skip),
        take: parseInt(limit),
      }),
      prisma.trainerCertification.count({ where }),
    ]);

    res.json({
      success: true,
      data: {
        certifications,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / limit),
        },
      },
      message: 'Certifications retrieved successfully',
    });
  } catch (error) {
    console.error('Error getting all certifications:', error);
    res.status(500).json({
      success: false,
      data: null,
      message: 'Internal server error',
    });
  }
};

/**
 * Get certification statistics
 */
const getCertificationStats = async (req, res) => {
  try {
    const [
      totalCertifications,
      pendingCertifications,
      verifiedCertifications,
      rejectedCertifications,
      expiredCertifications,
      categoryStats,
      levelStats,
    ] = await Promise.all([
      prisma.trainerCertification.count({
        where: { is_active: true },
      }),
      prisma.trainerCertification.count({
        where: { verification_status: 'PENDING', is_active: true },
      }),
      prisma.trainerCertification.count({
        where: { verification_status: 'VERIFIED', is_active: true },
      }),
      prisma.trainerCertification.count({
        where: { verification_status: 'REJECTED', is_active: true },
      }),
      prisma.trainerCertification.count({
        where: { verification_status: 'EXPIRED', is_active: true },
      }),
      prisma.trainerCertification.groupBy({
        by: ['category'],
        where: { is_active: true },
        _count: {
          category: true,
        },
      }),
      prisma.trainerCertification.groupBy({
        by: ['certification_level'],
        where: { is_active: true },
        _count: {
          certification_level: true,
        },
      }),
    ]);

    // Get expiring soon certifications (within 30 days)
    const thirtyDaysFromNow = new Date();
    thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);

    const expiringSoon = await prisma.trainerCertification.count({
      where: {
        verification_status: 'VERIFIED',
        is_active: true,
        expiration_date: {
          lte: thirtyDaysFromNow,
          gt: new Date(),
        },
      },
    });

    res.json({
      success: true,
      data: {
        overview: {
          total: totalCertifications,
          pending: pendingCertifications,
          verified: verifiedCertifications,
          rejected: rejectedCertifications,
          expired: expiredCertifications,
          expiringSoon: expiringSoon,
        },
        categoryStats: categoryStats.map(stat => ({
          category: stat.category,
          count: stat._count.category,
        })),
        levelStats: levelStats.map(stat => ({
          level: stat.certification_level,
          count: stat._count.certification_level,
        })),
      },
      message: 'Certification statistics retrieved successfully',
    });
  } catch (error) {
    console.error('Error getting certification stats:', error);
    res.status(500).json({
      success: false,
      data: null,
      message: 'Internal server error',
    });
  }
};

/**
 * Get a specific certification by ID
 */
const getCertificationById = async (req, res) => {
  try {
    const { certId } = req.params;

    const certification = await prisma.trainerCertification.findUnique({
      where: { id: certId },
      include: {
        trainer: {
          select: {
            id: true,
            full_name: true,
            email: true,
            phone: true,
            profile_photo: true,
          },
        },
      },
    });

    if (!certification) {
      return res.status(404).json({
        success: false,
        data: null,
        message: 'Certification not found',
      });
    }

    res.json({
      success: true,
      data: certification,
      message: 'Certification retrieved successfully',
    });
  } catch (error) {
    console.error('Error getting certification by ID:', error);
    res.status(500).json({
      success: false,
      data: null,
      message: 'Internal server error',
    });
  }
};

/**
 * Suspend a certification
 */
const suspendCertification = async (req, res) => {
  try {
    const { certId } = req.params;
    const { verified_by, reason } = req.body;

    if (!verified_by) {
      return res.status(400).json({
        success: false,
        data: null,
        message: 'Admin user ID is required for suspension',
      });
    }

    // Get certification before update to check if it was VERIFIED
    const certBeforeUpdate = await prisma.trainerCertification.findUnique({
      where: { id: certId },
      select: { verification_status: true, category: true },
    });

    const certification = await prisma.trainerCertification.update({
      where: { id: certId },
      data: {
        verification_status: 'SUSPENDED',
        verified_by: verified_by,
        verified_at: new Date(),
        rejection_reason: reason,
      },
      include: {
        trainer: {
          select: {
            id: true,
            full_name: true,
            email: true,
          },
        },
      },
    });

    // If certification was VERIFIED before suspension, remove the specialization
    // (only if no other valid certifications exist for that category)
    if (certBeforeUpdate && certBeforeUpdate.verification_status === 'VERIFIED') {
      try {
        const specializationSyncService = require('../services/specialization-sync.service.js');
        console.log(
          `[SYNC] Removing specialization ${certification.category} from trainer ${certification.trainer_id} after suspending verified certification`
        );
        const removeResult = await specializationSyncService.removeSpecialization(
          certification.trainer_id,
          certification.category
        );
        if (removeResult && removeResult.success) {
          if (removeResult.removed) {
            console.log(
              `[SUCCESS] Removed specialization ${certification.category} from trainer ${certification.trainer_id} after suspension`
            );
          } else {
            console.log(
              `[INFO]  Specialization ${certification.category} kept - trainer still has other valid certifications`
            );
          }
        }
      } catch (removeError) {
        console.error('[ERROR] Error removing specialization after suspension:', removeError);
      }
    }

    res.json({
      success: true,
      data: certification,
      message: 'Certification suspended successfully',
    });
  } catch (error) {
    console.error('Error suspending certification:', error);
    res.status(500).json({
      success: false,
      data: null,
      message: 'Internal server error',
    });
  }
};

module.exports = {
  getPendingCertifications,
  verifyCertification,
  rejectCertification,
  getAllCertifications,
  getCertificationStats,
  getCertificationById,
  suspendCertification,
};
