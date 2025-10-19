const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const aiScanner = require('../services/ai-certification-scanner.service.js');
const notificationService = require('../services/notification.service.js');
const s3UploadService = require('../services/s3-upload.service.js');

// ==================== TRAINER CERTIFICATION ENDPOINTS ====================

/**
 * Get all certifications for a trainer
 */
const getTrainerCertifications = async (req, res) => {
  try {
    const { trainerId } = req.params;

    const certifications = await prisma.trainerCertification.findMany({
      where: {
        trainer_id: trainerId,
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
    const { trainerId } = req.params;
    const {
      category,
      certification_name,
      certification_issuer,
      certification_level,
      issued_date,
      expiration_date,
      certificate_file_url,
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
    const trainer = await prisma.trainer.findUnique({
      where: { id: trainerId },
    });

    if (!trainer) {
      return res.status(404).json({
        success: false,
        data: null,
        message: 'Trainer not found',
      });
    }

    // Check for existing certification in the same category
    const existingCert = await prisma.trainerCertification.findFirst({
      where: {
        trainer_id: trainerId,
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
    let verificationStatus = 'PENDING';
    let aiScanResult = null;

    if (certificate_file_url) {
      console.log('🔍 Starting AI scan for certificate...');
      aiScanResult = await aiScanner.scanForRedSeal(certificate_file_url);

      if (aiScanResult.hasRedSeal && aiScanResult.confidence > 0.7) {
        verificationStatus = 'VERIFIED';
        console.log('✅ AI auto-verification successful');
      } else {
        console.log('❌ AI scan failed or low confidence, manual review required');
      }
    }

    // Create certification
    const certification = await prisma.trainerCertification.create({
      data: {
        trainer_id: trainerId,
        category,
        certification_name,
        certification_issuer,
        certification_level,
        issued_date: new Date(issued_date),
        expiration_date: expiration_date ? new Date(expiration_date) : null,
        verification_status: verificationStatus,
        verified_by: verificationStatus === 'VERIFIED' ? 'AI_SYSTEM' : null,
        verified_at: verificationStatus === 'VERIFIED' ? new Date() : null,
        certificate_file_url,
        certificate_file_type: certificate_file_url ? 'image' : null,
        is_active: true,
      },
    });

    // Send notification to admins
    await notificationService.sendCertificationUploadNotification({
      trainerId,
      trainerName: trainer.full_name,
      certificationId: certification.id,
      category,
      certificationLevel: certification_level,
      verificationStatus,
      aiScanResult,
    });

    // Send notification to trainer
    await notificationService.sendCertificationStatusNotification({
      trainerId,
      trainerName: trainer.full_name,
      certificationId: certification.id,
      category,
      verificationStatus,
      message:
        verificationStatus === 'VERIFIED'
          ? 'Your certification has been automatically verified by AI'
          : 'Your certification is pending manual review',
    });

    res.json({
      success: true,
      data: {
        ...certification,
        aiScanResult,
      },
      message:
        verificationStatus === 'VERIFIED'
          ? 'Certification created successfully and auto-verified by AI'
          : 'Certification created successfully and is pending verification',
    });
  } catch (error) {
    console.error('Error creating certification:', error);
    res.status(500).json({
      success: false,
      data: null,
      message: 'Internal server error',
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

    // Remove fields that shouldn't be updated directly
    delete updateData.id;
    delete updateData.trainer_id;
    delete updateData.created_at;

    const certification = await prisma.trainerCertification.update({
      where: { id: certId },
      data: updateData,
    });

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

      const fileInfo = {
        url: req.file.location,
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

    const result = await s3UploadService.generatePresignedUrl(fileName, mimeType, trainerId);

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

    const certification = await prisma.trainerCertification.findFirst({
      where: {
        trainer_id: trainerId,
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
