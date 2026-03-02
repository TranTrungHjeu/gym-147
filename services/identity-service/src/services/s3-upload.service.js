const { v2: cloudinary } = require('cloudinary');
const multer = require('multer');
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const path = require('path');
const crypto = require('crypto');

/**
 * Cloudinary Upload Service for User Avatars
 * Handles uploading avatar images and generating URLs
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
        const allowedMimeTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
        if (allowedMimeTypes.includes(file.mimetype.toLowerCase())) {
          cb(null, true);
        } else {
          cb(new Error('Only image files (JPEG, PNG, WebP) are allowed'), false);
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
   * Upload file to Cloudinary manually
   * @param {Buffer} fileBuffer - File buffer
   * @param {string} originalName - Original filename
   * @param {string} mimeType - File MIME type
   * @param {string} userId - User ID who uploaded
   * @returns {Object} - Upload result with URL and key
   */
  async uploadFile(fileBuffer, originalName, mimeType, userId = 'unknown') {
    try {
      // Validate file size
      if (fileBuffer.length > 5 * 1024 * 1024) {
        return {
          success: false,
          error: 'File size exceeds 5MB limit',
        };
      }

      // Validate MIME type
      const allowedMimeTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
      if (!allowedMimeTypes.includes(mimeType.toLowerCase())) {
        return {
          success: false,
          error: 'Invalid file type. Only JPEG, PNG, and WebP are allowed',
        };
      }

      // Generate unique public ID
      const uniqueSuffix = crypto.randomBytes(16).toString('hex');

      // Upload to Cloudinary using upload_stream
      const uploadResult = await new Promise((resolve, reject) => {
        const uploadStream = cloudinary.uploader.upload_stream(
          {
            folder: this.folder,
            public_id: uniqueSuffix,
            resource_type: 'image',
          },
          (error, result) => {
            if (error) return reject(error);
            resolve(result);
          }
        );
        uploadStream.end(fileBuffer);
      });

      console.log(`[SUCCESS] Avatar uploaded successfully: ${uploadResult.secure_url}`);

      return {
        success: true,
        url: uploadResult.secure_url,
        key: uploadResult.public_id,
        originalName,
        size: fileBuffer.length,
      };
    } catch (error) {
      console.error('[ERROR] Error uploading avatar to Cloudinary:', error);
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

      // Extract the path from the URL, excluding the version number and extension
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

