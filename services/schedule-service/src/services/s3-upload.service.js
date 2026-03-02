const { v2: cloudinary } = require('cloudinary');
const multer = require('multer');
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const path = require('path');
const crypto = require('crypto');

/**
 * Cloudinary Upload Service for Certificate Images
 * Handles uploading certificate images to Cloudinary and generating URLs
 */

class S3UploadService {
  constructor() {
    // Initialize Cloudinary client
    cloudinary.config({
      cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
      api_key: process.env.CLOUDINARY_API_KEY,
      api_secret: process.env.CLOUDINARY_API_SECRET,
    });

    this.folder = 'certifications';

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
        fileSize: 10 * 1024 * 1024, // 10MB limit
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
  getUploadMiddleware(fieldName = 'certificate_file') {
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
      console.log(`Uploading file to Cloudinary: ${originalName}`);

      // Generate unique public ID
      const uniqueSuffix = crypto.randomBytes(16).toString('hex');

      // Upload to Cloudinary
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

      console.log(`[SUCCESS] File uploaded successfully: ${uploadResult.secure_url}`);

      return {
        success: true,
        url: uploadResult.secure_url,
        key: uploadResult.public_id,
        originalName,
        size: fileBuffer.length,
      };
    } catch (error) {
      console.error('Error uploading file to Cloudinary:', error);
      return {
        success: false,
        error: error.message,
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
      console.log(`Deleting file from Cloudinary: ${publicId}`);

      const result = await cloudinary.uploader.destroy(publicId);

      console.log(`File deleted successfully: ${publicId}`);

      return {
        success: true,
        key: publicId,
        result
      };
    } catch (error) {
      console.error('Error deleting file from Cloudinary:', error);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Generate presigned URL for direct upload from frontend
   * In Cloudinary, we return the upload signature instead.
   * @param {string} fileName - Original filename
   * @param {string} mimeType - File MIME type
   * @param {string} userId - User ID
   * @returns {Object} - Cloudinary Signature payload
   */
  async generatePresignedUrl(fileName, mimeType, userId = 'unknown') {
    try {
      console.log(`[LINK] Generating Cloudinary upload signature for: ${fileName}`);

      const timestamp = Math.round((new Date).getTime() / 1000);
      const signature = cloudinary.utils.api_sign_request({
        timestamp: timestamp,
        folder: this.folder,
      }, process.env.CLOUDINARY_API_SECRET);

      return {
        success: true,
        signature,
        timestamp,
        cloudName: process.env.CLOUDINARY_CLOUD_NAME,
        apiKey: process.env.CLOUDINARY_API_KEY,
        folder: this.folder,
      };
    } catch (error) {
      console.error('Error generating Cloudinary signature:', error);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Extract Cloudinary key from URL
   * @param {string} url - Cloudinary URL
   * @returns {string} - Cloudinary key
   */
  extractKeyFromUrl(url) {
    try {
      if (!url) return null;

      const urlMatches = url.match(/\/v\d+\/(.+?)(?:\.[a-z0-9]+)?$/i);

      if (urlMatches && urlMatches[1]) {
        return urlMatches[1];
      }

      return null;
    } catch (error) {
      console.error('Error extracting key from URL:', error);
      return null;
    }
  }


  /**
   * Get file info from Cloudinary URL
   * @param {string} url - Cloudinary URL
   * @returns {Object} - File info
   */
  getFileInfoFromUrl(url) {
    try {
      const key = this.extractKeyFromUrl(url);
      if (!key) {
        return null;
      }

      return {
        key,
        url,
        isCloudinary: url.includes('cloudinary.com'),
      };
    } catch (error) {
      console.error('Error getting file info from URL:', error);
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

  /**
   * Test Cloudinary connection
   * @returns {Object} - Test result
   */
  async testConnection() {
    try {
      console.log('Testing Cloudinary connection...');

      const testContent = 'Cloudinary connection test';

      // Try to upload a test file
      const uploadResult = await this.uploadFile(
        Buffer.from(testContent),
        'test.txt',
        'text/plain',
        'system'
      );

      if (!uploadResult.success) {
        return {
          success: false,
          error: uploadResult.error,
        };
      }

      // Try to delete the test file
      const deleteResult = await this.deleteFile(uploadResult.key);

      if (!deleteResult.success) {
        console.warn('Test file uploaded but could not be deleted');
      }

      console.log('Cloudinary connection test successful');

      return {
        success: true,
        message: 'Cloudinary connection test successful',
      };
    } catch (error) {
      console.error('Cloudinary connection test failed:', error);
      return {
        success: false,
        error: error.message,
      };
    }
  }
}

module.exports = new S3UploadService();
