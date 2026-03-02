const { v2: cloudinary } = require('cloudinary');
const multer = require('multer');
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const path = require('path');
const crypto = require('crypto');
const imageOptimization = require('./image-optimization.service');
const FileValidationUtil = require('../utils/file-validation.util');

/**
 * Cloudinary Upload Service for Member Avatars
 * Handles uploading avatar images to Cloudinary and generating URLs
 */

class S3UploadService {
  constructor() {
    // Initialize Cloudinary client
    cloudinary.config({
      cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
      api_key: process.env.CLOUDINARY_API_KEY,
      api_secret: process.env.CLOUDINARY_API_SECRET,
    });

    this.folder = 'avatars'; // Default folder for avatars

    // Initialize multer with Cloudinary storage
    const storage = new CloudinaryStorage({
      cloudinary: cloudinary,
      params: {
        folder: this.folder,
        allowed_formats: ['jpg', 'png', 'jpeg', 'webp'],
        public_id: (req, file) => {
          const uniqueSuffix = crypto.randomBytes(16).toString('hex');
          return `${uniqueSuffix}`;
        },
      },
    });

    this.upload = multer({
      storage: storage,
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

      // Generate unique public ID for Cloudinary
      const uniqueSuffix = crypto.randomBytes(16).toString('hex');

      // Upload to Cloudinary
      const uploadResult = await new Promise((resolve, reject) => {
        const uploadStream = cloudinary.uploader.upload_stream(
          {
            folder: folder,
            public_id: uniqueSuffix,
            resource_type: 'image',
          },
          (error, result) => {
            if (error) return reject(error);
            resolve(result);
          }
        );
        uploadStream.end(optimizedBuffer);
      });

      const url = uploadResult.secure_url;
      const key = uploadResult.public_id;

      console.log(`[SUCCESS] Avatar uploaded successfully: ${url}`);

      return {
        success: true,
        url,
        key,
        originalName,
        originalSize: fileBuffer.length,
        optimizedSize: optimizedBuffer.length,
        compressionRatio: optimizationResult?.compressionRatio || '0',
        metadata: imageValidation.metadata,
      };
    } catch (error) {
      console.error('[ERROR] Error uploading avatar to Cloudinary:', error);
      console.error('[ERROR] Error details:', {
        message: error.message,
        name: error.name,
      });
      return {
        success: false,
        error: error.message || 'Unknown error during Cloudinary upload',
      };
    }
  }

  /**
   * Delete file from Cloudinary
   * @param {string} publicId - Cloudinary public ID
   * @returns {Object} - Delete result
   */
  async deleteFile(publicId) {
    try {
      console.log(`[DELETE] Deleting avatar from Cloudinary: ${publicId}`);

      const result = await cloudinary.uploader.destroy(publicId);

      console.log(`[SUCCESS] Avatar deleted successfully: ${publicId}`);

      return {
        success: true,
        key: publicId,
        result,
      };
    } catch (error) {
      console.error('[ERROR] Error deleting avatar from Cloudinary:', error);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Extract Cloudinary public_id from URL
   * @param {string} url - Cloudinary URL
   * @returns {string} - Cloudinary public_id
   */
  extractKeyFromUrl(url) {
    try {
      if (!url) return null;

      // Format: http://res.cloudinary.com/<cloud_name>/<resource_type>/<type>/<version>/<public_id>.<format>
      const urlMatches = url.match(/\/v\d+\/(.+?)(?:\.[a-z0-9]+)?$/i);

      if (urlMatches && urlMatches[1]) {
        return urlMatches[1];
      }

      return null;
    } catch (error) {
      console.error('[ERROR] Error extracting key from URL:', error);
      return null;
    }
  }

  /**
   * Validate Cloudinary configuration
   * @returns {Object} - Validation result
   */
  validateConfiguration() {
    const requiredEnvVars = ['CLOUDINARY_CLOUD_NAME', 'CLOUDINARY_API_KEY', 'CLOUDINARY_API_SECRET'];

    const missing = requiredEnvVars.filter(envVar => !process.env[envVar]);

    if (missing.length > 0) {
      return {
        valid: false,
        missing,
        message: `Missing required environment variables for Cloudinary: ${missing.join(', ')}`,
      };
    }

    return {
      valid: true,
      cloudName: process.env.CLOUDINARY_CLOUD_NAME,
    };
  }
}

module.exports = new S3UploadService();
