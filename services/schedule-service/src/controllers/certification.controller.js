const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const aiScanner = require('../services/ai-certification-scanner.service.js');
const notificationService = require('../services/notification.service.js');
const s3UploadService = require('../services/s3-upload.service.js');
const specializationSyncService = require('../services/specialization-sync.service.js');
const cdnService = require('../services/cdn.service.js');

// Import dayjs for timezone handling
const dayjs = require('dayjs');
const utc = require('dayjs/plugin/utc');
const timezone = require('dayjs/plugin/timezone');
dayjs.extend(utc);
dayjs.extend(timezone);

// ==================== HELPER FUNCTIONS ====================

/**
 * Map certification level to Vietnamese
 */
const getLevelLabel = (level) => {
  const levelMap = {
    BASIC: 'Cơ bản',
    INTERMEDIATE: 'Trung cấp',
    ADVANCED: 'Nâng cao',
    EXPERT: 'Chuyên gia',
  };
  return levelMap[level] || level;
};

/**
 * Map category to Vietnamese
 */
const getCategoryLabel = (category) => {
  const categoryMap = {
    CARDIO: 'Tim mạch',
    STRENGTH: 'Sức mạnh',
    YOGA: 'Yoga',
    PILATES: 'Pilates',
    DANCE: 'Khiêu vũ',
    MARTIAL_ARTS: 'Võ thuật',
    AQUA: 'Bơi lội',
    FUNCTIONAL: 'Chức năng',
    RECOVERY: 'Phục hồi',
    SPECIALIZED: 'Chuyên biệt',
  };
  return categoryMap[category] || category;
};

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

    // Get all certifications (including inactive ones) for trainer to see full history
    // With new logic allowing multiple certifications per category, we want to show all
    const certifications = await prisma.trainerCertification.findMany({
      where: {
        trainer_id: actualTrainerId,
        // Include both active and inactive to show full history
        // Frontend can filter if needed
      },
      orderBy: [
        {
          category: 'asc',
        },
        {
          verification_status: 'asc', // VERIFIED first, then PENDING, REJECTED, etc.
        },
        {
          certification_level: 'desc', // Higher level first
        },
        {
          expiration_date: 'desc', // Later expiration first (nulls last)
        },
        {
          created_at: 'desc', // Newer first
        },
      ],
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
    console.log('\n🚀 [CREATE_CERT] ========== CERTIFICATION CREATION REQUEST RECEIVED ==========');
    console.log('🚀 [CREATE_CERT] Request method:', req.method);
    console.log('🚀 [CREATE_CERT] Request URL:', req.url);
    console.log('🚀 [CREATE_CERT] Request params:', JSON.stringify(req.params, null, 2));
    console.log('🚀 [CREATE_CERT] Request body keys:', Object.keys(req.body || {}));
    console.log('🚀 [CREATE_CERT] Request body:', JSON.stringify({
      ...req.body,
      certificate_file_url: req.body?.certificate_file_url ? 'PRESENT' : 'MISSING',
      aiScanResult: req.body?.aiScanResult ? 'PRESENT' : 'MISSING',
    }, null, 2));
    
    const { trainerId } = req.params;
    console.log('📍 [CREATE_CERT] trainerId from params:', trainerId);
    
    const {
      category,
      certification_name,
      certification_issuer,
      certification_level,
      issued_date,
      expiration_date,
      certificate_file_url,
      aiScanResult, // AI scan result from frontend (if already scanned)
      skipAiScan, // Flag to skip AI scan for manual entry
    } = req.body;

    console.log('📍 [CREATE_CERT] Extracted data:', {
      category,
      certification_name,
      certification_level,
      hasCertificateFile: !!certificate_file_url,
      skipAiScan: skipAiScan === true || skipAiScan === 'true' || skipAiScan === 1,
      skipAiScanType: typeof skipAiScan,
      skipAiScanValue: skipAiScan,
      hasAiScanResult: !!aiScanResult,
    });

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

    // Check for existing VERIFIED certifications in the same category
    // Only check VERIFIED certs to determine if we should reject the new cert
    // We will NOT deactivate old certs here - only when new cert is verified
    const existingVerifiedCerts = await prisma.trainerCertification.findMany({
      where: {
        trainer_id: actualTrainerId,
        category: category,
        verification_status: 'VERIFIED',
        is_active: true,
      },
    });

    const levelOrder = { BASIC: 1, INTERMEDIATE: 2, ADVANCED: 3, EXPERT: 4 };
    const newLevel = levelOrder[certification_level];

    // Only validate and reject if there's a higher level VERIFIED cert
    // Don't deactivate anything here - wait for admin verification
    if (existingVerifiedCerts.length > 0) {
      // Check if there's a VERIFIED cert with higher level
      const higherLevelCerts = existingVerifiedCerts.filter(
        cert => levelOrder[cert.certification_level] > newLevel
      );

      if (higherLevelCerts.length > 0) {
        // Reject if there's a higher level VERIFIED cert
        const highestCert = higherLevelCerts.reduce((prev, curr) =>
          levelOrder[curr.certification_level] > levelOrder[prev.certification_level]
            ? curr
            : prev
        );
        const levelLabel = getLevelLabel(highestCert.certification_level);
        const categoryLabel = getCategoryLabel(category);
        return res.status(400).json({
          success: false,
          data: null,
          message: `Đã có chứng chỉ ${levelLabel} đã được xác thực cho ${categoryLabel}. Chỉ chấp nhận cấp độ cao hơn.`,
        });
      }

      // Check if there's a VERIFIED cert with same name/issuer but higher or same level
      const sameNameIssuerCert = existingVerifiedCerts.find(
        cert =>
          cert.certification_name === certification_name &&
          cert.certification_issuer === certification_issuer
      );

      if (sameNameIssuerCert) {
        const currentLevel = levelOrder[sameNameIssuerCert.certification_level];
        if (newLevel <= currentLevel) {
          // Level thấp hơn hoặc bằng: Reject
          const levelLabel = getLevelLabel(sameNameIssuerCert.certification_level);
          const categoryLabel = getCategoryLabel(category);
          return res.status(400).json({
            success: false,
            data: null,
            message: `Đã có chứng chỉ ${levelLabel} đã được xác thực cho ${categoryLabel} từ cùng tổ chức. Chỉ chấp nhận cấp độ cao hơn.`,
          });
        }
        // If newLevel > currentLevel, allow creation but don't deactivate yet
        // Will be handled when new cert is verified
      }
    }

    // AI Scan the certificate if URL is provided
    // Logic: Use AI scan result from frontend if available, otherwise scan on backend
    // Only auto-verify if AI scan is successful with high confidence
    // IMPORTANT: If skipAiScan is true, skip AI scan regardless of whether file exists
    let verificationStatus = 'PENDING';
    let finalAiScanResult = null;
    let aiScanPerformed = false;

    // Normalize skipAiScan flag (handle boolean, string, number)
    const shouldSkipAiScan = skipAiScan === true || skipAiScan === 'true' || skipAiScan === 1 || skipAiScan === '1';
    console.log(`🔍 [CREATE_CERT] AI Scan Logic: skipAiScan=${skipAiScan} (type: ${typeof skipAiScan}), shouldSkipAiScan=${shouldSkipAiScan}, hasFile=${!!certificate_file_url}`);

    // Validate and normalize aiScanResult from frontend (only if not skipping AI scan)
    if (!shouldSkipAiScan && aiScanResult && typeof aiScanResult === 'object') {
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
        console.log('✅ [CREATE_CERT] Using AI scan result from frontend (already scanned during upload)');
        console.log('📍 [CREATE_CERT] AI scan result summary:', {
          hasRedSeal: finalAiScanResult.hasRedSeal,
          confidence: finalAiScanResult.confidence,
          source: finalAiScanResult.source,
        });
      } catch (parseError) {
        console.error('❌ [CREATE_CERT] Error parsing aiScanResult from frontend:', parseError);
        finalAiScanResult = null; // Will trigger backend scan
      }
    }

    // Determine verification status based on skipAiScan flag and file presence
    if (shouldSkipAiScan) {
      // Manual entry - skip AI scan, always set to PENDING for admin review
      verificationStatus = 'PENDING';
      console.log('ℹ️ [CREATE_CERT] Manual entry detected (skipAiScan=true) - Skipping AI scan, requires admin review (PENDING)');
      console.log('ℹ️ [CREATE_CERT] skipAiScan value:', skipAiScan, 'type:', typeof skipAiScan);
      // Don't perform AI scan, even if file exists
    } else if (certificate_file_url) {
      // File uploaded and AI scan is not skipped
      // If frontend already provided AI scan result, use it (avoid re-scanning)
      if (finalAiScanResult) {
        aiScanPerformed = true;

        // Only auto-verify if AI scan is successful with high confidence
        if (finalAiScanResult.hasRedSeal && finalAiScanResult.confidence > 0.7) {
          verificationStatus = 'VERIFIED';
          console.log('✅ [CREATE_CERT] AI auto-verification successful - Certification automatically approved');
        } else {
          verificationStatus = 'PENDING';
          console.log(
            '⚠️ [CREATE_CERT] AI scan completed but verification failed or low confidence - Manual review required'
          );
          console.log(`   - Has red seal: ${finalAiScanResult?.hasRedSeal || false}`);
          console.log(`   - Confidence: ${finalAiScanResult?.confidence || 0}`);
        }
      } else {
        // Frontend didn't provide AI scan result, scan on backend
        try {
          console.log('🔍 [CREATE_CERT] Starting AI scan for certificate on backend...');
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
              '✅ [CREATE_CERT] AI auto-verification successful - Certification automatically approved'
            );
          } else {
            verificationStatus = 'PENDING';
            console.log(
              '⚠️ [CREATE_CERT] AI scan completed but verification failed or low confidence - Manual review required'
            );
            console.log(`   - Has red seal: ${finalAiScanResult?.hasRedSeal || false}`);
            console.log(`   - Confidence: ${finalAiScanResult?.confidence || 0}`);
          }
        } catch (aiError) {
          console.error('❌ [CREATE_CERT] AI scan error:', aiError);
          verificationStatus = 'PENDING';
          console.log('⚠️ [CREATE_CERT] AI scan failed - Manual review required');
        }
      }
    } else {
      // No certificate file uploaded (manual entry without file)
      console.log('ℹ️ [CREATE_CERT] No certificate file uploaded - Manual review required (PENDING)');
      verificationStatus = 'PENDING'; // Ensure PENDING status for manual entry
      console.log(`✅ [CREATE_CERT] Verification status set to PENDING for manual entry (no file)`);
    }
    
    // Final verification status check
    const isManualEntryFinal = shouldSkipAiScan || !certificate_file_url;
    console.log(`📊 [CREATE_CERT] Final verification status: ${verificationStatus}`);
    console.log(`📊 [CREATE_CERT] Final determination: isManualEntry=${isManualEntryFinal}, hasFile=${!!certificate_file_url}, shouldSkipAiScan=${shouldSkipAiScan}, aiScanPerformed=${aiScanPerformed}`);

    // Helper function to get current date in Vietnam timezone (GMT+7) - date only (no time)
    const getVietnamDateOnly = () => {
      // Get current time in Vietnam timezone and return date only (00:00:00)
      const vnTime = dayjs().tz('Asia/Ho_Chi_Minh');
      return vnTime.startOf('day').toDate();
    };

    // Helper function to parse date string and convert to Vietnam timezone - date only (no time)
    const parseDateVietnam = (dateString) => {
      if (!dateString) return null;
      
      try {
        // Parse the date string (assume it's in YYYY-MM-DD format or ISO format)
        // Strategy: Parse as local date first, then interpret it as Vietnam timezone
        
        // If dateString is just a date (YYYY-MM-DD), parse it and set to Vietnam timezone at 00:00:00
        if (typeof dateString === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(dateString)) {
          // Date only format (YYYY-MM-DD) - interpret as Vietnam timezone
          const [year, month, day] = dateString.split('-').map(Number);
          // Create date in Vietnam timezone (GMT+7)
          const vnDate = dayjs.tz(`${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')} 00:00:00`, 'Asia/Ho_Chi_Minh');
          if (vnDate.isValid()) {
            return vnDate.toDate();
          }
        }
        
        // Try parsing as ISO string or other formats
        // First try parsing as if it's already in Vietnam timezone
        let vnDate = dayjs.tz(dateString, 'Asia/Ho_Chi_Minh');
        
        if (!vnDate.isValid()) {
          // Try parsing as UTC, then convert to Vietnam timezone
          const utcDate = dayjs.utc(dateString);
          if (utcDate.isValid()) {
            vnDate = utcDate.tz('Asia/Ho_Chi_Minh');
          } else {
            // Try parsing as local date, then convert to Vietnam timezone
            const localDate = dayjs(dateString);
            if (localDate.isValid()) {
              // Assume the date string represents a date in Vietnam timezone
              // Extract date parts and create in Vietnam timezone
              const dateObj = localDate.toDate();
              const year = dateObj.getFullYear();
              const month = dateObj.getMonth() + 1;
              const day = dateObj.getDate();
              vnDate = dayjs.tz(`${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')} 00:00:00`, 'Asia/Ho_Chi_Minh');
            } else {
              return null;
            }
          }
        }
        
        if (!vnDate.isValid()) {
          return null;
        }
        
        // Return date only (00:00:00 in Vietnam timezone)
        return vnDate.startOf('day').toDate();
      } catch (error) {
        console.error(`❌ [CREATE_CERT] Error parsing date: ${dateString}`, error);
        return null;
      }
    };

    // Validate and parse dates
    let issuedDate;
    let expirationDate = null;

    try {
      console.log(`\n📅 [CREATE_CERT] ========== VALIDATING DATES WITH VIETNAM TIMEZONE (GMT+7) ==========`);
      console.log(`📅 [CREATE_CERT] issued_date input: ${issued_date}`);
      console.log(`📅 [CREATE_CERT] expiration_date input: ${expiration_date}`);
      
      // Get current date in Vietnam timezone (GMT+7) - date only (no time)
      const nowVietnam = getVietnamDateOnly();
      const nowVietnamStr = dayjs(nowVietnam).tz('Asia/Ho_Chi_Minh').format('YYYY-MM-DD');
      console.log(`📅 [CREATE_CERT] Current date (Vietnam GMT+7): ${nowVietnamStr}`);
      
      // Parse issued_date in Vietnam timezone
      const issuedDateVietnam = parseDateVietnam(issued_date);
      
      if (!issuedDateVietnam) {
        return res.status(400).json({
          success: false,
          data: null,
          message: `Ngày cấp không hợp lệ: ${issued_date}. Vui lòng kiểm tra lại định dạng ngày (định dạng: YYYY-MM-DD).`,
        });
      }

      // Convert to Date object for database storage (still in UTC, but we compare in Vietnam timezone)
      issuedDate = issuedDateVietnam;
      const issuedDateStr = dayjs(issuedDateVietnam).tz('Asia/Ho_Chi_Minh').format('YYYY-MM-DD');
      console.log(`📅 [CREATE_CERT] Issued date (Vietnam GMT+7): ${issuedDateStr}`);

      // Validate issued_date is not in the future (compare dates only, not time)
      if (issuedDateVietnam > nowVietnam) {
        return res.status(400).json({
          success: false,
          data: null,
          message: `Ngày cấp (${issuedDateStr}) không thể là ngày trong tương lai (hôm nay là ${nowVietnamStr} theo giờ Việt Nam). Vui lòng kiểm tra lại ngày cấp.`,
        });
      }

      if (expiration_date) {
        // Parse expiration_date in Vietnam timezone
        const expirationDateVietnam = parseDateVietnam(expiration_date);
        
        if (!expirationDateVietnam) {
          return res.status(400).json({
            success: false,
            data: null,
            message: `Ngày hết hạn không hợp lệ: ${expiration_date}. Vui lòng kiểm tra lại định dạng ngày (định dạng: YYYY-MM-DD).`,
          });
        }

        // Convert to Date object for database storage
        expirationDate = expirationDateVietnam;
        const expirationDateStr = dayjs(expirationDateVietnam).tz('Asia/Ho_Chi_Minh').format('YYYY-MM-DD');
        console.log(`📅 [CREATE_CERT] Expiration date (Vietnam GMT+7): ${expirationDateStr}`);

        // Validate expiration_date is after issued_date (compare dates only)
        if (expirationDateVietnam < issuedDateVietnam) {
          return res.status(400).json({
            success: false,
            data: null,
            message: `Ngày hết hạn (${expirationDateStr}) không thể trước ngày cấp (${issuedDateStr}). Vui lòng kiểm tra lại.`,
          });
        }

        // Reject if expiration_date is in the past (certification already expired)
        // Compare dates only (not time) in Vietnam timezone
        if (expirationDateVietnam < nowVietnam) {
          return res.status(400).json({
            success: false,
            data: null,
            message: `Chứng chỉ đã hết hạn. Ngày hết hạn (${expirationDateStr}) đã qua (hôm nay là ${nowVietnamStr} theo giờ Việt Nam). Vui lòng kiểm tra lại ngày hết hạn hoặc tải lên chứng chỉ mới còn hiệu lực.`,
          });
        }
      }
      
      console.log(`✅ [CREATE_CERT] Date validation passed (Vietnam timezone GMT+7)`);
    } catch (dateError) {
      console.error('❌ [CREATE_CERT] Date parsing error:', dateError);
      console.error('❌ [CREATE_CERT] Error stack:', dateError.stack);
      return res.status(400).json({
        success: false,
        data: null,
        message: `Lỗi xử lý ngày tháng: ${dateError.message}. Vui lòng kiểm tra lại định dạng ngày (định dạng: YYYY-MM-DD).`,
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
          is_active: true, // Always create as active - deactivation will happen when verified
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

    // Send notification to admins and trainer (don't fail if notification fails)
    // IMPORTANT: Always send notification for PENDING certifications (manual entry, AI scan failed, or no file)
    // Also send notification for VERIFIED certifications (AI auto-verified)
    // Manual entry is determined by: skipAiScan flag is true OR no certificate file URL
    const shouldSkipAiScanFinal = skipAiScan === true || skipAiScan === 'true' || skipAiScan === 1 || skipAiScan === '1';
    const isManualEntry = shouldSkipAiScanFinal || !certificate_file_url;
    
    console.log(`\n📢 [CREATE_CERT] ========== STARTING NOTIFICATION PROCESS ==========`);
    console.log(`📢 [CREATE_CERT] Certification created successfully:`, {
      certificationId: certification.id,
      trainerId: actualTrainerId,
      trainerName: trainer.full_name,
      category,
      certificationLevel: certification_level,
      verificationStatus,
      isManualEntry,
      shouldSkipAiScan: shouldSkipAiScanFinal,
      skipAiScanRaw: skipAiScan,
      skipAiScanType: typeof skipAiScan,
      hasCertificateFile: !!certificate_file_url,
      hasAiScanResult: !!finalAiScanResult,
      aiScanPerformed,
    });
    console.log(`📢 [CREATE_CERT] Manual entry determination: skipAiScan=${skipAiScan} (type: ${typeof skipAiScan}), shouldSkipAiScan=${shouldSkipAiScanFinal}, hasFile=${!!certificate_file_url}, isManualEntry=${isManualEntry}`);
    
    // Send notification to admins (for PENDING or VERIFIED certifications)
    // This should ALWAYS be called for PENDING certifications (including manual entry)
    console.log(`\n📢 [CREATE_CERT] ========== STEP 1: SENDING NOTIFICATION TO ADMINS ==========`);
    console.log(`📢 [CREATE_CERT] Step 1: Sending notification to admins...`);
    console.log(`📢 [CREATE_CERT] Step 1: Parameters:`, {
      trainerId: actualTrainerId,
      trainerName: trainer.full_name,
      certificationId: certification.id,
      category,
      certificationLevel: certification_level,
      verificationStatus,
      isManualEntry,
      hasAiScanResult: !!finalAiScanResult,
    });
    
    try {
      const notificationResult = await notificationService.sendCertificationUploadNotification({
        trainerId: actualTrainerId,
        trainerName: trainer.full_name,
        certificationId: certification.id,
        category,
        certificationLevel: certification_level,
        verificationStatus,
        aiScanResult: finalAiScanResult,
        isManualEntry, // Flag to indicate manual entry
      });
      console.log(`✅ [CREATE_CERT] Step 1: Admin notification sent successfully`);
      console.log(`✅ [CREATE_CERT] Step 1: Result:`, notificationResult || 'No return value');
      console.log(`📢 [CREATE_CERT] ========== END STEP 1 ==========\n`);
    } catch (adminNotifError) {
      console.error('\n❌ [CREATE_CERT] ========== STEP 1: CRITICAL ERROR ==========');
      console.error('❌ [CREATE_CERT] Step 1: Error sending admin notification:', adminNotifError);
      console.error('❌ [CREATE_CERT] Step 1: Error stack:', adminNotifError.stack);
      console.error('❌ [CREATE_CERT] Step 1: Error details:', {
        message: adminNotifError.message,
        code: adminNotifError.code,
        name: adminNotifError.name,
        trainerId: actualTrainerId,
        certificationId: certification.id,
        verificationStatus,
        isManualEntry,
        response: adminNotifError.response?.data,
        status: adminNotifError.response?.status,
      });
      console.error('❌ [CREATE_CERT] ========== END CRITICAL ERROR ==========\n');
      // Don't fail the request if notification fails, but log it clearly
    }
    
    // Send notification to trainer
    try {
      // Emit certification:created event to trainer for optimistic UI update
      if (global.io && trainer.user_id) {
        const trainerRoomName = `user:${trainer.user_id}`;
        const trainerSocketData = {
          id: certification.id,
          certification_id: certification.id,
          trainer_id: actualTrainerId,
          category,
          certification_name: certification_name,
          certification_issuer: certification_issuer,
          certification_level: certification_level,
          issued_date: certification.issued_date,
          expiration_date: certification.expiration_date,
          verification_status: verificationStatus,
          certificate_file_url: certification.certificate_file_url,
          is_active: certification.is_active,
          created_at: certification.created_at,
          updated_at: certification.updated_at,
        };

        const trainerRoom = global.io.sockets.adapter.rooms.get(trainerRoomName);
        const trainerSocketCount = trainerRoom ? trainerRoom.size : 0;

        console.log(
          `📡 [CREATE_CERT] Emitting certification:created to trainer room ${trainerRoomName} (${trainerSocketCount} socket(s) connected)`
        );
        global.io.to(trainerRoomName).emit('certification:created', trainerSocketData);
        console.log(`✅ [CREATE_CERT] Emitted certification:created event to trainer`);
      }

      if (verificationStatus === 'VERIFIED' && finalAiScanResult) {
        // AI auto-verified: send "AI duyệt" notification to trainer (role: AI)
        console.log(`📢 [CREATE_CERT] Step 2: Sending AI verification notification to trainer...`);
        await notificationService.notifyCertificationAutoVerified(
          actualTrainerId,
          certification.id,
          finalAiScanResult
        );
        console.log(`✅ [CREATE_CERT] Step 2: AI verification notification sent to trainer`);
      } else if (verificationStatus === 'PENDING') {
        // PENDING: send notification to trainer about pending status
        console.log(`📢 [CREATE_CERT] Step 2: Sending pending status notification to trainer...`);
        console.log(`📢 [CREATE_CERT] Step 2: isManualEntry=${isManualEntry}, aiScanPerformed=${aiScanPerformed}`);
        
        await notificationService.sendCertificationStatusNotification({
          trainerId: actualTrainerId,
          trainerName: trainer.full_name,
          certificationId: certification.id,
          category,
          certificationLevel: certification_level,
          verificationStatus: 'PENDING',
          isManualEntry,
          message:
            isManualEntry
              ? `Chứng chỉ ${category} (${certification_level}) của bạn đã được gửi và đang chờ quản trị viên duyệt`
              : aiScanPerformed
              ? `Chứng chỉ ${category} (${certification_level}) của bạn đang chờ xem xét thủ công bởi quản trị viên (AI scan không đạt yêu cầu)`
              : `Chứng chỉ ${category} (${certification_level}) của bạn đang chờ xem xét thủ công bởi quản trị viên (không có quét AI)`,
        });
        console.log(`✅ [CREATE_CERT] Step 2: Pending status notification sent to trainer (isManualEntry: ${isManualEntry})`);
      } else {
        console.log(`ℹ️ [CREATE_CERT] Step 2: Skipping trainer notification - verificationStatus is ${verificationStatus}`);
      }
    } catch (trainerNotifError) {
      console.error('❌ [CREATE_CERT] Step 2: Error sending trainer notification:', trainerNotifError);
      console.error('❌ [CREATE_CERT] Step 2: Error stack:', trainerNotifError.stack);
      console.error('❌ [CREATE_CERT] Step 2: Error details:', {
        message: trainerNotifError.message,
        code: trainerNotifError.code,
        trainerId: actualTrainerId,
        certificationId: certification.id,
        verificationStatus,
        isManualEntry,
      });
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

    // Get FULL certification before update to track all changes
    const certBeforeUpdate = await prisma.trainerCertification.findUnique({
      where: { id: certId },
      select: {
        trainer_id: true,
        verification_status: true,
        category: true,
        expiration_date: true,
        is_active: true,
      },
    });

    if (!certBeforeUpdate) {
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

    // Track all changes that might affect specializations
    const statusChanged =
      updateData.verification_status &&
      updateData.verification_status !== certBeforeUpdate.verification_status;
    const categoryChanged =
      updateData.category && updateData.category !== certBeforeUpdate.category;
    const expirationChanged =
      updateData.expiration_date !== undefined &&
      (!certBeforeUpdate.expiration_date ||
        new Date(updateData.expiration_date).getTime() !==
          new Date(certBeforeUpdate.expiration_date).getTime());
    const isActiveChanged =
      updateData.is_active !== undefined &&
      updateData.is_active !== certBeforeUpdate.is_active;

    const isBeingVerified =
      statusChanged &&
      updateData.verification_status === 'VERIFIED' &&
      certBeforeUpdate.verification_status !== 'VERIFIED';
    const isBeingUnverified =
      statusChanged &&
      certBeforeUpdate.verification_status === 'VERIFIED' &&
      updateData.verification_status !== 'VERIFIED';

    // Update verification timestamps if being verified
    if (isBeingVerified) {
      updateData.verified_at = new Date();
      if (!updateData.verified_by) {
        updateData.verified_by = req.user?.id || 'ADMIN';
      }
    }

    // Update certification
    const certification = await prisma.trainerCertification.update({
      where: { id: certId },
      data: updateData,
    });

    // Handle specialization sync based on ALL changes
    const specializationSyncService = require('../services/specialization-sync.service.js');

    try {
      // Case 1: Verification status changed to VERIFIED → Add specialization
      if (isBeingVerified) {
        console.log(
          `🔄 Status changed to VERIFIED - syncing specializations for trainer ${certBeforeUpdate.trainer_id}`
        );
        const syncResult = await specializationSyncService.updateTrainerSpecializations(
          certBeforeUpdate.trainer_id
        );
        if (syncResult && syncResult.success) {
          console.log(`✅ Specializations synced after verification`);
        }
      }
      // Case 2: Verification status changed from VERIFIED → Remove specialization
      else if (isBeingUnverified) {
        console.log(
          `🔄 Status changed from VERIFIED to ${updateData.verification_status} - removing specialization ${certBeforeUpdate.category}`
        );
        const removeResult = await specializationSyncService.removeSpecialization(
          certBeforeUpdate.trainer_id,
          certBeforeUpdate.category
        );
        if (removeResult && removeResult.success) {
          console.log(
            removeResult.removed
              ? `✅ Specialization ${certBeforeUpdate.category} removed`
              : `ℹ️ Specialization kept - trainer has other valid certifications`
          );
        }
      }
      // Case 3: Category changed (and was VERIFIED) → Remove old, add new
      else if (categoryChanged && certBeforeUpdate.verification_status === 'VERIFIED') {
        console.log(
          `🔄 Category changed from ${certBeforeUpdate.category} to ${updateData.category} - updating specializations`
        );
        // Remove old category
        const removeResult = await specializationSyncService.removeSpecialization(
          certBeforeUpdate.trainer_id,
          certBeforeUpdate.category
        );
        // Add new category (if new status is also VERIFIED)
        if (certification.verification_status === 'VERIFIED') {
          const syncResult = await specializationSyncService.updateTrainerSpecializations(
            certBeforeUpdate.trainer_id
          );
          if (syncResult && syncResult.success) {
            console.log(`✅ Specializations updated after category change`);
          }
        }
      }
      // Case 4: Expiration date changed → Check if expired (using Vietnam timezone)
      else if (
        expirationChanged &&
        certBeforeUpdate.verification_status === 'VERIFIED' &&
        certification.verification_status === 'VERIFIED'
      ) {
        // Helper function to parse date in Vietnam timezone
        const parseDateVietnamForUpdate = (dateValue) => {
          if (!dateValue) return null;
          try {
            const dateString = dateValue instanceof Date ? dateValue.toISOString().split('T')[0] : String(dateValue);
            if (/^\d{4}-\d{2}-\d{2}$/.test(dateString)) {
              const [year, month, day] = dateString.split('-').map(Number);
              const vnDate = dayjs.tz(`${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')} 00:00:00`, 'Asia/Ho_Chi_Minh');
              return vnDate.isValid() ? vnDate.toDate() : null;
            }
            const vnDate = dayjs.tz(dateString, 'Asia/Ho_Chi_Minh');
            if (vnDate.isValid()) {
              return vnDate.startOf('day').toDate();
            }
            const utcDate = dayjs.utc(dateString);
            if (utcDate.isValid()) {
              return utcDate.tz('Asia/Ho_Chi_Minh').startOf('day').toDate();
            }
            return null;
          } catch (error) {
            return null;
          }
        };
        
        // Get current date in Vietnam timezone (GMT+7) - date only (no time)
        const nowVietnam = dayjs().tz('Asia/Ho_Chi_Minh').startOf('day').toDate();
        const newExpiration = parseDateVietnamForUpdate(updateData.expiration_date);

        // Compare dates only (not time) in Vietnam timezone
        if (newExpiration && newExpiration < nowVietnam) {
          const expirationDateStr = dayjs(newExpiration).tz('Asia/Ho_Chi_Minh').format('YYYY-MM-DD');
          const nowStr = dayjs(nowVietnam).tz('Asia/Ho_Chi_Minh').format('YYYY-MM-DD');
          console.log(
            `🔄 Certification expired after expiration_date update (${expirationDateStr} < ${nowStr} Vietnam GMT+7) - removing specialization ${certBeforeUpdate.category}`
          );
          const removeResult = await specializationSyncService.removeSpecialization(
            certBeforeUpdate.trainer_id,
            certBeforeUpdate.category
          );
          if (removeResult && removeResult.success) {
            console.log(`✅ Specialization removed due to expiration`);
          }
        } else {
          // Expiration date updated but not expired - sync to ensure consistency
          console.log(`🔄 Expiration date updated - syncing specializations for consistency`);
          const syncResult = await specializationSyncService.updateTrainerSpecializations(
            certBeforeUpdate.trainer_id
          );
          if (syncResult && syncResult.success) {
            console.log(`✅ Specializations synced after expiration date update`);
          }
        }
      }
      // Case 5: is_active changed (reactivate/deactivate)
      else if (isActiveChanged) {
        if (updateData.is_active === false && certBeforeUpdate.verification_status === 'VERIFIED') {
          // Deactivate: Remove specialization
          console.log(
            `🔄 Certification deactivated - removing specialization ${certBeforeUpdate.category}`
          );
          const removeResult = await specializationSyncService.removeSpecialization(
            certBeforeUpdate.trainer_id,
            certBeforeUpdate.category
          );
          if (removeResult && removeResult.success) {
            console.log(`✅ Specialization removed after deactivation`);
          }
        } else if (
          updateData.is_active === true &&
          certification.verification_status === 'VERIFIED'
        ) {
          // Reactivate: Add specialization
          console.log(
            `🔄 Certification reactivated - syncing specializations for trainer ${certBeforeUpdate.trainer_id}`
          );
          const syncResult = await specializationSyncService.updateTrainerSpecializations(
            certBeforeUpdate.trainer_id
          );
          if (syncResult && syncResult.success) {
            console.log(`✅ Specializations synced after reactivation`);
          }
        }
      }
      // Case 6: Other updates (level, name, etc.) - sync to ensure consistency if VERIFIED
      else if (
        certification.verification_status === 'VERIFIED' &&
        certification.is_active === true
      ) {
        // Sync to ensure we have the highest level certification
        console.log(
          `🔄 Certification updated (level/name/etc.) - syncing specializations for consistency`
        );
        const syncResult = await specializationSyncService.updateTrainerSpecializations(
          certBeforeUpdate.trainer_id
        );
        if (syncResult && syncResult.success && syncResult.changed) {
          console.log(`✅ Specializations updated after certification change`);
        } else {
          console.log(`ℹ️ No changes needed in specializations`);
        }
      } else {
        console.log(
          `ℹ️ Skipping specialization sync - certification status: ${certification.verification_status}, is_active: ${certification.is_active}`
        );
      }
    } catch (syncError) {
      console.error('❌ Error syncing specializations after certification update:', syncError);
      console.error('❌ Sync error stack:', syncError.stack);
      // Don't fail the request if sync fails, but log it for debugging
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
 * Delete certification (hard delete - permanently remove from database)
 * Syncs specialization, sends notification to trainer, then deletes the record
 */
const deleteCertification = async (req, res) => {
  try {
    const { certId } = req.params;
    const { reason } = req.body;

    // Get certification with trainer info BEFORE deletion
    const certification = await prisma.trainerCertification.findUnique({
      where: { id: certId },
      include: {
        trainer: {
          select: {
            id: true,
            full_name: true,
            user_id: true,
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

    // Store certification data for notification before deletion
    const certificationData = {
      id: certification.id,
      trainer_id: certification.trainer_id,
      category: certification.category,
      certification_name: certification.certification_name,
      trainer: certification.trainer,
    };

    // Remove only the specific specialization related to this certification
    // Only remove if there are no other valid certifications for that category
    try {
      console.log(
        `🔄 Removing specialization ${certificationData.category} from trainer ${certificationData.trainer_id} after certification deletion`
      );
      const removeResult = await specializationSyncService.removeSpecialization(
        certificationData.trainer_id,
        certificationData.category,
        certId // Exclude the certification being deleted from the check
      );
      if (removeResult && removeResult.success) {
        if (removeResult.removed) {
          console.log(
            `✅ Removed specialization ${certificationData.category} from trainer ${certificationData.trainer_id} after certification deletion`
          );
          console.log(`📋 Updated specializations:`, removeResult.specializations);
        } else {
          console.log(
            `ℹ️  Specialization ${certificationData.category} kept for trainer ${certificationData.trainer_id} - still has other valid certifications`
          );
        }
      } else {
        console.error(
          `❌ Failed to remove specialization for trainer ${certificationData.trainer_id}:`,
          removeResult?.error || 'Unknown error'
        );
      }
    } catch (removeError) {
      console.error('❌ Error removing specialization:', removeError);
      console.error('❌ Remove error stack:', removeError.stack);
      // Don't fail the request if removal fails
    }

    // Send notification to trainer with reason (before deletion)
    try {
      await notificationService.sendCertificationDeletedNotification({
        trainerId: certificationData.trainer_id,
        trainerName: certificationData.trainer.full_name,
        certificationId: certId,
        category: certificationData.category,
        certificationName: certificationData.certification_name,
        reason: reason || 'Không có lý do được cung cấp',
        deletedBy: req.user?.id || 'ADMIN',
      });
    } catch (notifError) {
      console.error('❌ Error sending deletion notification:', notifError);
      // Don't fail the request if notification fails
    }

    // Hard delete - permanently remove from database
    await prisma.trainerCertification.delete({
      where: { id: certId },
    });

    console.log(`✅ Certification ${certId} permanently deleted from database`);

    res.json({
      success: true,
      data: {
        id: certificationData.id,
        deleted: true,
      },
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
