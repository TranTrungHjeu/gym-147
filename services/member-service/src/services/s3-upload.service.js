const { S3Client, PutObjectCommand, DeleteObjectCommand } = require('@aws-sdk/client-s3');
const { getSignedUrl } = require('@aws-sdk/s3-request-presigner');
const multer = require('multer');
const multerS3 = require('multer-s3');
const path = require('path');
const crypto = require('crypto');
const imageOptimization = require('./image-optimization.service');
const FileValidationUtil = require('../utils/file-validation.util');
const cdnService = require('./cdn.service');

/**
 * AWS S3 Upload Service for Member Avatars
 * Handles uploading avatar images to S3 and generating URLs
 */

class S3UploadService {
  constructor() {
    // Initialize S3 client
    this.s3Client = new S3Client({
      region: process.env.AWS_REGION || 'us-east-1',
      credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
      },
    });

    // S3 bucket configuration
    this.bucketName = process.env.AWS_S3_BUCKET_NAME;
    this.folder = 'avatars'; // Default folder for avatars

    // Initialize multer with S3 storage
    this.upload = multer({
      storage: multerS3({
        s3: this.s3Client,
        bucket: this.bucketName,
        key: (req, file, cb) => {
          // Generate unique filename
          const uniqueSuffix = crypto.randomBytes(16).toString('hex');
          const extension = path.extname(file.originalname);
          const filename = `${this.folder}/${uniqueSuffix}${extension}`;
          cb(null, filename);
        },
        contentType: multerS3.AUTO_CONTENT_TYPE,
        metadata: (req, file, cb) => {
          cb(null, {
            fieldName: file.fieldname,
            originalName: file.originalname,
            uploadedBy: req.user?.id || 'unknown',
            uploadedAt: new Date().toISOString(),
          });
        },
      }),
      limits: {
        fileSize: 5 * 1024 * 1024, // 5MB limit for avatars
      },
      fileFilter: (req, file, cb) => {
        // Only allow image files
        if (file.mimetype.startsWith('image/')) {
          cb(null, true);
        } else {
          cb(new Error('Only image files are allowed'), false);
        }
      },
    });
  }

  /**
   * Get multer middleware for file upload
   * @param {string} fieldName - Field name for the file input
   * @returns {Function} - Multer middleware
   */
  getUploadMiddleware(fieldName = 'avatar') {
    return this.upload.single(fieldName);
  }

  /**
   * Upload file to S3 manually with image optimization
   * @param {Buffer} fileBuffer - File buffer
   * @param {string} originalName - Original filename
   * @param {string} mimeType - File MIME type
   * @param {string} userId - User ID who uploaded
   * @param {Object} options - Upload options (optimize, createThumbnail, folder)
   * @returns {Object} - Upload result with URL and key
   */
  async uploadFile(fileBuffer, originalName, mimeType, userId = 'unknown', options = {}) {
    try {
      const folder = options.folder || this.folder;
      console.log(`📤 Uploading file to S3 (${folder}): ${originalName}`);

      // Comprehensive file validation
      const fileValidation = FileValidationUtil.validateFile(fileBuffer, mimeType, {
        maxSize: 5 * 1024 * 1024, // 5MB
        minSize: 1024, // 1KB minimum
        allowedMimeTypes: ['image/jpeg', 'image/png', 'image/webp'],
        checkSignature: true,
      });

      if (!fileValidation.valid) {
        return {
          success: false,
          error: fileValidation.error,
        };
      }

      // Validate image dimensions and format
      const imageValidation = await imageOptimization.validateImage(fileBuffer, {
        maxWidth: 4096,
        maxHeight: 4096,
        maxSize: 5 * 1024 * 1024, // 5MB
        allowedFormats: ['jpeg', 'jpg', 'png', 'webp'],
      });

      if (!imageValidation.success) {
        return {
          success: false,
          error: imageValidation.error,
        };
      }

      // Optimize image if enabled (default: true for avatars)
      let optimizedBuffer = fileBuffer;
      let optimizationResult = null;
      let finalMimeType = mimeType;

      if (options.optimize !== false) {
        console.log('[IMAGE] Optimizing image...');
        optimizationResult = await imageOptimization.optimizeAvatar(fileBuffer);

        if (optimizationResult.success) {
          optimizedBuffer = optimizationResult.buffer;
          finalMimeType = 'image/jpeg'; // Avatar is always converted to JPEG
          console.log(`[SUCCESS] Image optimized: ${optimizationResult.compressionRatio}% smaller`);
        } else {
          console.warn('[WARNING] Image optimization failed, using original:', optimizationResult.error);
        }
      }

      // Generate unique filename (always .jpg for optimized images)
      const uniqueSuffix = crypto.randomBytes(16).toString('hex');
      const extension = options.optimize !== false ? '.jpg' : path.extname(originalName);
      const key = `${folder}/${uniqueSuffix}${extension}`;

      // Upload to S3
      const command = new PutObjectCommand({
        Bucket: this.bucketName,
        Key: key,
        Body: optimizedBuffer,
        ContentType: finalMimeType,
        CacheControl: 'public, max-age=31536000', // Cache for 1 year
        Metadata: {
          originalName,
          uploadedBy: userId,
          uploadedAt: new Date().toISOString(),
          originalSize: fileBuffer.length.toString(),
          optimizedSize: optimizedBuffer.length.toString(),
        },
      });

      await this.s3Client.send(command);

      // Generate public URL (with CDN if configured)
      const url = cdnService.getUrl(key);

      console.log(`[SUCCESS] Avatar uploaded successfully: ${url}`);

      return {
        success: true,
        url,
        key,
        bucket: this.bucketName,
        originalName,
        originalSize: fileBuffer.length,
        optimizedSize: optimizedBuffer.length,
        compressionRatio: optimizationResult?.compressionRatio || '0',
        metadata: imageValidation.metadata,
      };
    } catch (error) {
      console.error('[ERROR] Error uploading avatar to S3:', error);
      console.error('[ERROR] Error details:', {
        message: error.message,
        code: error.code,
        name: error.name,
        stack: error.stack,
        bucket: this.bucketName,
        region: process.env.AWS_REGION,
        hasCredentials: !!(process.env.AWS_ACCESS_KEY_ID && process.env.AWS_SECRET_ACCESS_KEY),
      });
      return {
        success: false,
        error: error.message || 'Unknown error during S3 upload',
        code: error.code,
      };
    }
  }

  /**
   * Delete file from S3
   * @param {string} key - S3 object key
   * @returns {Object} - Delete result
   */
  async deleteFile(key) {
    try {
      console.log(`[DELETE] Deleting avatar from S3: ${key}`);

      const command = new DeleteObjectCommand({
        Bucket: this.bucketName,
        Key: key,
      });

      await this.s3Client.send(command);

      console.log(`[SUCCESS] Avatar deleted successfully: ${key}`);

      return {
        success: true,
        key,
      };
    } catch (error) {
      console.error('[ERROR] Error deleting avatar from S3:', error);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Extract S3 key from URL
   * @param {string} url - S3 URL
   * @returns {string} - S3 key
   */
  extractKeyFromUrl(url) {
    try {
      if (!url) return null;

      const urlObj = new URL(url);
      const pathname = urlObj.pathname;

      // Remove leading slash
      const key = pathname.substring(1);

      return key;
    } catch (error) {
      console.error('[ERROR] Error extracting key from URL:', error);
      return null;
    }
  }

  /**
   * Validate S3 configuration
   * @returns {Object} - Validation result
   */
  validateConfiguration() {
    const requiredEnvVars = ['AWS_ACCESS_KEY_ID', 'AWS_SECRET_ACCESS_KEY', 'AWS_S3_BUCKET_NAME'];

    const missing = requiredEnvVars.filter(envVar => !process.env[envVar]);

    if (missing.length > 0) {
      return {
        valid: false,
        missing,
        message: `Missing required environment variables: ${missing.join(', ')}`,
      };
    }

    return {
      valid: true,
      bucketName: this.bucketName,
      region: process.env.AWS_REGION || 'us-east-1',
    };
  }
}

module.exports = new S3UploadService();
