const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const aiScanner = require('../services/ai-certification-scanner.service.js');
const notificationService = require('../services/notification.service.js');
const s3UploadService = require('../services/s3-upload.service.js');
const specializationSyncService = require('../services/specialization-sync.service.js');
const cdnService = require('../services/cdn.service.js');

// ==================== TRAINER CERTIFICATION ENDPOINTS ====================

/**
 * Helper function to find trainer by id or user_id
 * @param {string} trainerIdOrUserId - Either trainer.id or trainer.user_id
 * @returns {Promise<Object|null>} Trainer object with id, or null if not found
 */
const findTrainerByIdOrUserId = async trainerIdOrUserId => {
  // Try to find by trainer.id first
  let trainer = await prisma.trainer.findUnique({
    where: { id: trainerIdOrUserId },
  });

  // If not found by id, try to find by user_id (since frontend might send user_id)
  if (!trainer) {
    trainer = await prisma.trainer.findUnique({
      where: { user_id: trainerIdOrUserId },
    });
  }

  return trainer;
};

/**
 * Get all certifications for a trainer
 */
const getTrainerCertifications = async (req, res) => {
  try {
    const { trainerId } = req.params;

    const trainer = await findTrainerByIdOrUserId(trainerId);

    if (!trainer) {
      console.error(`❌ Trainer not found with id/user_id: ${trainerId}`);
      return res.status(404).json({
        success: false,
        data: null,
        message: `Trainer not found with id: ${trainerId}`,
      });
    }

    const actualTrainerId = trainer.id;

    const certifications = await prisma.trainerCertification.findMany({
      where: {
        trainer_id: actualTrainerId,
        is_active: true,
      },
      orderBy: {
        created_at: 'desc',
      },
    });

    res.json({
      success: true,
      data: certifications,
      message: 'Certifications retrieved successfully',
    });
  } catch (error) {
    console.error('Error fetching certifications:', error);
    res.status(500).json({
      success: false,
      data: null,
      message: 'Internal server error',
    });
  }
};

/**
 * Create a new certification with AI scanning
 */
const createCertification = async (req, res) => {
  try {
    console.log('🔍 createCertification called');
    console.log('📍 req.params:', req.params);
    console.log('📍 req.body:', req.body);
    const { trainerId } = req.params;
    console.log('📍 trainerId from params:', trainerId);
    const {
      category,
      certification_name,
      certification_issuer,
      certification_level,
      issued_date,
      expiration_date,
      certificate_file_url,
      aiScanResult, // AI scan result from frontend (if already scanned)
    } = req.body;

    // Validate required fields
    if (
      !category ||
      !certification_name ||
      !certification_issuer ||
      !certification_level ||
      !issued_date
    ) {
      return res.status(400).json({
        success: false,
        data: null,
        message: 'Missing required fields',
      });
    }

    // Check if trainer exists
    const trainer = await findTrainerByIdOrUserId(trainerId);

    if (!trainer) {
      console.error(`❌ Trainer not found with id/user_id: ${trainerId}`);
      return res.status(404).json({
        success: false,
        data: null,
        message: `Trainer not found with id: ${trainerId}`,
      });
    }

    // Use trainer.id for all subsequent operations
    const actualTrainerId = trainer.id;
    console.log(
      `✅ Found trainer: id=${actualTrainerId}, user_id=${trainer.user_id}, name=${trainer.full_name}`
    );

    // Check for existing certification in the same category
    const existingCert = await prisma.trainerCertification.findFirst({
      where: {
        trainer_id: actualTrainerId,
        category: category,
        is_active: true,
      },
    });

    if (existingCert) {
      // Check if new certification level is higher
      const levelOrder = { BASIC: 1, INTERMEDIATE: 2, ADVANCED: 3, EXPERT: 4 };
      const currentLevel = levelOrder[existingCert.certification_level];
      const newLevel = levelOrder[certification_level];

      if (newLevel <= currentLevel) {
        return res.status(400).json({
          success: false,
          data: null,
          message: `Trainer already has a ${existingCert.certification_level} certification for ${category}. Only higher level certifications are allowed.`,
        });
      }

      // Deactivate old certification
      await prisma.trainerCertification.update({
        where: { id: existingCert.id },
        data: { is_active: false },
      });
    }

    // AI Scan the certificate if URL is provided
    // Logic: Use AI scan result from frontend if available, otherwise scan on backend
    // Only auto-verify if AI scan is successful with high confidence
    let verificationStatus = 'PENDING';
    let finalAiScanResult = null;
    let aiScanPerformed = false;

    // Validate and normalize aiScanResult from frontend
    if (aiScanResult && typeof aiScanResult === 'object') {
      try {
        // Extract only the fields we need, avoid circular references
        finalAiScanResult = {
          hasRedSeal: Boolean(aiScanResult.hasRedSeal),
          isGym147Seal: Boolean(aiScanResult.isGym147Seal),
          confidence: Number(aiScanResult.confidence) || 0,
          similarityScore: aiScanResult.similarityScore
            ? Number(aiScanResult.similarityScore)
            : undefined,
          description: aiScanResult.description || undefined,
          sealLocation: aiScanResult.sealLocation || undefined,
          sealType: aiScanResult.sealType || undefined,
          source: aiScanResult.source || 'Frontend',
          extractedData: aiScanResult.extractedData || undefined,
        };
        console.log('✅ Using AI scan result from frontend (already scanned during upload)');
        console.log('📍 AI scan result summary:', {
          hasRedSeal: finalAiScanResult.hasRedSeal,
          confidence: finalAiScanResult.confidence,
          source: finalAiScanResult.source,
        });
      } catch (parseError) {
        console.error('❌ Error parsing aiScanResult from frontend:', parseError);
        finalAiScanResult = null; // Will trigger backend scan
      }
    }

    if (certificate_file_url) {
      // If frontend already provided AI scan result, use it (avoid re-scanning)
      if (finalAiScanResult) {
        aiScanPerformed = true;

        // Only auto-verify if AI scan is successful with high confidence
        if (finalAiScanResult.hasRedSeal && finalAiScanResult.confidence > 0.7) {
          verificationStatus = 'VERIFIED';
          console.log('✅ AI auto-verification successful - Certification automatically approved');
        } else {
          verificationStatus = 'PENDING';
          console.log(
            '⚠️ AI scan completed but verification failed or low confidence - Manual review required'
          );
          console.log(`   - Has red seal: ${finalAiScanResult?.hasRedSeal || false}`);
          console.log(`   - Confidence: ${finalAiScanResult?.confidence || 0}`);
        }
      } else {
        // Frontend didn't provide AI scan result, scan on backend
        try {
          console.log('🔍 Starting AI scan for certificate on backend...');
          finalAiScanResult = await aiScanner.scanForRedSeal(certificate_file_url);
          aiScanPerformed = true;

          // Only auto-verify if AI scan is successful with high confidence
          if (
            finalAiScanResult &&
            finalAiScanResult.hasRedSeal &&
            finalAiScanResult.confidence > 0.7
          ) {
            verificationStatus = 'VERIFIED';
            console.log(
              '✅ AI auto-verification successful - Certification automatically approved'
            );
          } else {
            verificationStatus = 'PENDING';
            console.log(
              '⚠️ AI scan completed but verification failed or low confidence - Manual review required'
            );
            console.log(`   - Has red seal: ${finalAiScanResult?.hasRedSeal || false}`);
            console.log(`   - Confidence: ${finalAiScanResult?.confidence || 0}`);
          }
        } catch (aiError) {
          console.error('❌ AI scan error:', aiError);
          verificationStatus = 'PENDING';
          console.log('⚠️ AI scan failed - Manual review required');
        }
      }
    } else {
      console.log('ℹ️ No certificate file uploaded - Manual review required (PENDING)');
    }

    // Validate and parse dates
    let issuedDate;
    let expirationDate = null;

    try {
      issuedDate = new Date(issued_date);
      if (isNaN(issuedDate.getTime())) {
        return res.status(400).json({
          success: false,
          data: null,
          message: `Ngày cấp không hợp lệ: ${issued_date}. Vui lòng kiểm tra lại định dạng ngày.`,
        });
      }

      // Validate issued_date is not in the future
      const now = new Date();
      if (issuedDate > now) {
        return res.status(400).json({
          success: false,
          data: null,
          message: `Ngày cấp không thể là ngày trong tương lai. Vui lòng kiểm tra lại ngày cấp: ${issued_date}`,
        });
      }

      if (expiration_date) {
        expirationDate = new Date(expiration_date);
        if (isNaN(expirationDate.getTime())) {
          return res.status(400).json({
            success: false,
            data: null,
            message: `Ngày hết hạn không hợp lệ: ${expiration_date}. Vui lòng kiểm tra lại định dạng ngày.`,
          });
        }

        // Validate expiration_date is after issued_date
        if (expirationDate < issuedDate) {
          return res.status(400).json({
            success: false,
            data: null,
            message: `Ngày hết hạn (${expiration_date}) không thể trước ngày cấp (${issued_date}). Vui lòng kiểm tra lại.`,
          });
        }

        // Reject if expiration_date is in the past (certification already expired)
        if (expirationDate < now) {
          return res.status(400).json({
            success: false,
            data: null,
            message: `Chứng chỉ đã hết hạn. Ngày hết hạn (${
              expiration_date.toISOString().split('T')[0]
            }) đã qua. Vui lòng kiểm tra lại ngày hết hạn hoặc tải lên chứng chỉ mới còn hiệu lực.`,
          });
        }
      }
    } catch (dateError) {
      console.error('❌ Date parsing error:', dateError);
      return res.status(400).json({
        success: false,
        data: null,
        message: `Lỗi xử lý ngày tháng: ${dateError.message}. Vui lòng kiểm tra lại định dạng ngày.`,
      });
    }

    // Create certification
    console.log('📝 Creating certification with data:', {
      trainer_id: actualTrainerId,
      category,
      certification_name,
      certification_level,
      issued_date: issuedDate,
      expiration_date: expirationDate,
      verification_status: verificationStatus,
    });

    let certification;
    try {
      certification = await prisma.trainerCertification.create({
        data: {
          trainer_id: actualTrainerId,
          category,
          certification_name,
          certification_issuer,
          certification_level,
          issued_date: issuedDate,
          expiration_date: expirationDate,
          verification_status: verificationStatus,
          verified_by: verificationStatus === 'VERIFIED' ? 'AI_SYSTEM' : null,
          verified_at: verificationStatus === 'VERIFIED' ? new Date() : null,
          certificate_file_url,
          certificate_file_type: certificate_file_url ? 'image' : null,
          is_active: true,
        },
      });
      console.log('✅ Certification created successfully:', certification.id);
    } catch (dbError) {
      console.error('❌ Database error creating certification:', dbError);
      console.error('❌ Database error details:', {
        message: dbError.message,
        code: dbError.code,
        meta: dbError.meta,
      });
      throw dbError; // Re-throw to be caught by outer catch block
    }

    // Auto-sync specializations if verified
    if (verificationStatus === 'VERIFIED') {
      try {
        console.log(
          `🔄 Starting specialization sync for trainer ${actualTrainerId} after certification creation with status VERIFIED`
        );
        const syncResult = await specializationSyncService.updateTrainerSpecializations(
          actualTrainerId
        );
        if (syncResult && syncResult.success) {
          console.log(
            `✅ Auto-synced specializations for trainer ${actualTrainerId} after certification creation`
          );
          console.log(`📋 Updated specializations:`, syncResult.specializations);
        } else {
          console.error(
            `❌ Specialization sync returned failure for trainer ${actualTrainerId}:`,
            syncResult?.error || 'Unknown error'
          );
        }
      } catch (syncError) {
        console.error('❌ Error auto-syncing specializations:', syncError);
        console.error('❌ Sync error stack:', syncError.stack);
        // Don't fail the request if sync fails, but log it for debugging
      }
    } else {
      console.log(
        `ℹ️ Skipping specialization sync - certification status is ${verificationStatus}, not VERIFIED`
      );
    }

    // Send notification to admins (don't fail if notification fails)
    try {
      await notificationService.sendCertificationUploadNotification({
        trainerId: actualTrainerId,
        trainerName: trainer.full_name,
        certificationId: certification.id,
        category,
        certificationLevel: certification_level,
        verificationStatus,
        aiScanResult: finalAiScanResult,
      });
    } catch (notifError) {
      console.error('❌ Error sending admin notification:', notifError);
      // Don't fail the request if notification fails
    }

    // Send notification to trainer (don't fail if notification fails)
    try {
      await notificationService.sendCertificationStatusNotification({
        trainerId: actualTrainerId,
        trainerName: trainer.full_name,
        certificationId: certification.id,
        category,
        verificationStatus,
        message:
          verificationStatus === 'VERIFIED'
            ? 'Chứng chỉ của bạn đã được tự động xác thực bởi AI'
            : aiScanPerformed
            ? 'Chứng chỉ của bạn đang chờ xem xét thủ công bởi quản trị viên (AI scan không đạt yêu cầu)'
            : 'Chứng chỉ của bạn đang chờ xem xét thủ công bởi quản trị viên (không có quét AI)',
      });
    } catch (notifError) {
      console.error('❌ Error sending trainer notification:', notifError);
      // Don't fail the request if notification fails
    }

    res.json({
      success: true,
      data: {
        ...certification,
        aiScanResult: finalAiScanResult,
        aiScanPerformed,
      },
      message:
        verificationStatus === 'VERIFIED'
          ? 'Chứng chỉ đã được tạo và tự động xác thực bởi AI'
          : aiScanPerformed
          ? 'Chứng chỉ đã được tạo và đang chờ xem xét thủ công (AI scan không đạt yêu cầu)'
          : 'Chứng chỉ đã được tạo và đang chờ xem xét thủ công (không có quét AI)',
    });
  } catch (error) {
    console.error('❌ Error creating certification:', error);
    console.error('❌ Error stack:', error.stack);
    console.error('❌ Error details:', {
      message: error.message,
      name: error.name,
      code: error.code,
    });

    // Return detailed error message in development, generic in production
    const errorMessage =
      process.env.NODE_ENV === 'development'
        ? `Internal server error: ${error.message}`
        : 'Internal server error';

    res.status(500).json({
      success: false,
      data: null,
      message: errorMessage,
      error: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
};

/**
 * Update certification
 */
const updateCertification = async (req, res) => {
  try {
    const { certId } = req.params;
    const updateData = req.body;

    // Get current certification to check if verification_status changed
    const currentCert = await prisma.trainerCertification.findUnique({
      where: { id: certId },
      select: { trainer_id: true, verification_status: true },
    });

    if (!currentCert) {
      return res.status(404).json({
        success: false,
        data: null,
        message: 'Certification not found',
      });
    }

    // Remove fields that shouldn't be updated directly
    delete updateData.id;
    delete updateData.trainer_id;
    delete updateData.created_at;

    // Check if verification_status is being changed to VERIFIED
    const isBeingVerified =
      updateData.verification_status === 'VERIFIED' &&
      currentCert.verification_status !== 'VERIFIED';

    // Update verification timestamps if being verified
    if (isBeingVerified) {
      updateData.verified_at = new Date();
      if (!updateData.verified_by) {
        updateData.verified_by = req.user?.id || 'ADMIN';
      }
    }

    const certification = await prisma.trainerCertification.update({
      where: { id: certId },
      data: updateData,
    });

    // Auto-sync specializations if verification_status changed to VERIFIED
    if (isBeingVerified) {
      try {
        console.log(
          `🔄 Starting specialization sync for trainer ${currentCert.trainer_id} after certification status changed to VERIFIED`
        );
        const syncResult = await specializationSyncService.updateTrainerSpecializations(
          currentCert.trainer_id
        );
        if (syncResult && syncResult.success) {
          console.log(
            `✅ Auto-synced specializations for trainer ${currentCert.trainer_id} after certification verification`
          );
          console.log(`📋 Updated specializations:`, syncResult.specializations);
        } else {
          console.error(
            `❌ Specialization sync returned failure for trainer ${currentCert.trainer_id}:`,
            syncResult?.error || 'Unknown error'
          );
        }
      } catch (syncError) {
        console.error('❌ Error auto-syncing specializations:', syncError);
        console.error('❌ Sync error stack:', syncError.stack);
        // Don't fail the request if sync fails, but log it for debugging
      }
    } else {
      console.log(
        `ℹ️ Skipping specialization sync - certification status is ${
          updateData.verification_status || currentCert.verification_status
        }, not being changed to VERIFIED`
      );
    }

    res.json({
      success: true,
      data: certification,
      message: 'Certification updated successfully',
    });
  } catch (error) {
    console.error('Error updating certification:', error);
    res.status(500).json({
      success: false,
      data: null,
      message: 'Internal server error',
    });
  }
};

/**
 * Delete certification (soft delete)
 */
const deleteCertification = async (req, res) => {
  try {
    const { certId } = req.params;

    // Soft delete by setting is_active to false
    const certification = await prisma.trainerCertification.update({
      where: { id: certId },
      data: { is_active: false },
    });

    res.json({
      success: true,
      data: certification,
      message: 'Certification deleted successfully',
    });
  } catch (error) {
    console.error('Error deleting certification:', error);
    res.status(500).json({
      success: false,
      data: null,
      message: 'Internal server error',
    });
  }
};

/**
 * Upload certificate file to S3
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const uploadCertificateToS3 = async (req, res) => {
  try {
    const { trainerId } = req.params;

    // Verify trainer exists
    const trainer = await findTrainerByIdOrUserId(trainerId);
    if (!trainer) {
      return res.status(404).json({
        success: false,
        data: null,
        message: `Trainer not found with id: ${trainerId}`,
      });
    }

    // Use multer middleware for S3 upload
    const uploadMiddleware = s3UploadService.getUploadMiddleware('certificate_file');

    uploadMiddleware(req, res, async err => {
      if (err) {
        console.error('Upload error:', err);
        return res.status(400).json({
          success: false,
          data: null,
          message: err.message,
        });
      }

      if (!req.file) {
        return res.status(400).json({
          success: false,
          data: null,
          message: 'No file uploaded',
        });
      }

      // Convert S3 URL to CDN URL if CDN is configured (similar to equipment images)
      const url = cdnService.convertS3UrlToCDN(req.file.location) || req.file.location;

      const fileInfo = {
        url,
        key: req.file.key,
        originalName: req.file.originalname,
        size: req.file.size,
        mimeType: req.file.mimetype,
        bucket: req.file.bucket,
      };

      console.log(`✅ File uploaded to S3: ${fileInfo.url}`);

      res.json({
        success: true,
        data: fileInfo,
        message: 'File uploaded successfully to S3',
      });
    });
  } catch (error) {
    console.error('Error uploading file to S3:', error);
    res.status(500).json({
      success: false,
      data: null,
      message: 'Internal server error',
    });
  }
};

/**
 * Generate presigned URL for direct upload from frontend
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const generatePresignedUrl = async (req, res) => {
  try {
    const { fileName, mimeType } = req.body;
    const { trainerId } = req.params;

    if (!fileName || !mimeType) {
      return res.status(400).json({
        success: false,
        data: null,
        message: 'fileName and mimeType are required',
      });
    }

    // Validate file type
    if (!mimeType.startsWith('image/')) {
      return res.status(400).json({
        success: false,
        data: null,
        message: 'Only image files are allowed',
      });
    }

    // Verify trainer exists
    const trainer = await findTrainerByIdOrUserId(trainerId);
    if (!trainer) {
      return res.status(404).json({
        success: false,
        data: null,
        message: `Trainer not found with id: ${trainerId}`,
      });
    }

    // Use trainer.id for S3 upload
    const actualTrainerId = trainer.id;
    const result = await s3UploadService.generatePresignedUrl(fileName, mimeType, actualTrainerId);

    if (!result.success) {
      return res.status(500).json({
        success: false,
        data: null,
        message: result.error,
      });
    }

    res.json({
      success: true,
      data: {
        presignedUrl: result.presignedUrl,
        publicUrl: result.publicUrl,
        key: result.key,
        expiresIn: result.expiresIn,
      },
      message: 'Presigned URL generated successfully',
    });
  } catch (error) {
    console.error('Error generating presigned URL:', error);
    res.status(500).json({
      success: false,
      data: null,
      message: 'Internal server error',
    });
  }
};

/**
 * Scan certificate with AI
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const scanCertificateWithAI = async (req, res) => {
  try {
    const { imageUrl } = req.body;

    if (!imageUrl) {
      return res.status(400).json({
        success: false,
        data: null,
        message: 'imageUrl is required',
      });
    }

    console.log('🔍 Starting AI scan for certificate...');
    const scanResult = await aiScanner.scanForRedSeal(imageUrl);

    res.json({
      success: true,
      data: scanResult,
      message: 'AI scan completed',
    });
  } catch (error) {
    console.error('Error scanning certificate with AI:', error);
    res.status(500).json({
      success: false,
      data: null,
      message: 'Internal server error',
    });
  }
};

/**
 * Get available categories for trainer
 */
const getAvailableCategories = async (req, res) => {
  try {
    const { trainerId } = req.params;

    // Verify trainer exists
    const trainer = await findTrainerByIdOrUserId(trainerId);
    if (!trainer) {
      return res.status(404).json({
        success: false,
        data: null,
        message: `Trainer not found with id: ${trainerId}`,
      });
    }

    const actualTrainerId = trainer.id;

    const certifications = await prisma.trainerCertification.findMany({
      where: {
        trainer_id: actualTrainerId,
        verification_status: 'VERIFIED',
        is_active: true,
        OR: [{ expiration_date: null }, { expiration_date: { gt: new Date() } }],
      },
      select: {
        category: true,
        certification_level: true,
      },
    });

    const categories = certifications.map(cert => ({
      category: cert.category,
      level: cert.certification_level,
    }));

    res.json({
      success: true,
      data: { categories },
      message: 'Available categories retrieved successfully',
    });
  } catch (error) {
    console.error('Error fetching available categories:', error);
    res.status(500).json({
      success: false,
      data: null,
      message: 'Internal server error',
    });
  }
};

/**
 * Check if trainer can access a specific category
 */
const checkCategoryAccess = async (req, res) => {
  try {
    const { trainerId, category } = req.params;

    // Verify trainer exists
    const trainer = await findTrainerByIdOrUserId(trainerId);
    if (!trainer) {
      return res.status(404).json({
        success: false,
        data: null,
        message: `Trainer not found with id: ${trainerId}`,
      });
    }

    const actualTrainerId = trainer.id;

    const certification = await prisma.trainerCertification.findFirst({
      where: {
        trainer_id: actualTrainerId,
        category: category,
        verification_status: 'VERIFIED',
        is_active: true,
        OR: [{ expiration_date: null }, { expiration_date: { gt: new Date() } }],
      },
    });

    res.json({
      success: true,
      data: {
        hasAccess: !!certification,
        certification: certification
          ? {
              level: certification.certification_level,
              issuedDate: certification.issued_date,
              expirationDate: certification.expiration_date,
            }
          : null,
      },
      message: 'Category access checked successfully',
    });
  } catch (error) {
    console.error('Error checking category access:', error);
    res.status(500).json({
      success: false,
      data: null,
      message: 'Internal server error',
    });
  }
};

/**
 * Scan certificate with A4F AI or Sharp (for testing)
 */
const scanCertificateWithA4F = async (req, res) => {
  try {
    const { imageUrl } = req.body;
    const { provider = 'a4f' } = req.query; // a4f, sharp

    if (!imageUrl) {
      return res.status(400).json({
        success: false,
        data: null,
        message: 'Image URL is required',
      });
    }

    // Only use AI analysis
    console.log('🤖 Using AI for certificate scanning...');
    let result = await aiScanner.scanWithAIModel(imageUrl);

    if (!result) {
      console.log('⚠️ AI failed, returning default result...');
      result = {
        hasRedSeal: false,
        isGym147Seal: false,
        confidence: 0,
        description: 'AI analysis failed',
        sealLocation: 'Unknown',
        sealType: 'Unknown',
        similarityScore: 0,
        source: 'AI Failed',
        imageUrl: imageUrl,
        timestamp: new Date().toISOString(),
      };
    }

    // Commented out Sharp analysis - only using AI
    /*
    let result;
    if (provider === 'a4f') {
      console.log('🤖 Using A4F AI for certificate scanning...');
      result = await aiScanner.scanWithA4F(imageUrl);
      if (!result) {
        console.log('⚠️ A4F AI failed, falling back to Sharp...');
        result = await aiScanner.scanWithSharp(imageUrl);
      }
    } else {
      console.log('🔍 Using Sharp analysis for certificate scanning...');
      result = await aiScanner.scanWithSharp(imageUrl);
    }
    */

    // Xử lý kết quả AI
    const isVerified = result?.isGym147Seal && result?.confidence > 0.7;
    const verificationStatus = isVerified ? 'AUTO_VERIFIED' : 'PENDING';

    res.json({
      success: true,
      data: {
        ...result,
        isVerified,
        verificationStatus,
        recommendation: isVerified
          ? 'Chứng chỉ hợp lệ - Con dấu Gym147 được xác nhận'
          : 'Chứng chỉ cần xem xét thêm - Con dấu không khớp hoặc độ tin cậy thấp',
      },
      message: `Certificate scanned successfully using ${result?.source || provider}`,
      provider: result?.source || provider,
    });
  } catch (error) {
    console.error('Error scanning certificate with AI:', error);
    res.status(500).json({
      success: false,
      data: null,
      message: 'Internal server error',
    });
  }
};

module.exports = {
  getTrainerCertifications,
  createCertification,
  updateCertification,
  deleteCertification,
  uploadCertificateToS3,
  generatePresignedUrl,
  scanCertificateWithAI,
  scanCertificateWithA4F,
  getAvailableCategories,
  checkCategoryAccess,
};
