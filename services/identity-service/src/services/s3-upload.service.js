const { S3Client, PutObjectCommand, DeleteObjectCommand } = require('@aws-sdk/client-s3');
const multer = require('multer');
const multerS3 = require('multer-s3');
const path = require('path');
const crypto = require('crypto');

/**
 * AWS S3 Upload Service for User Avatars
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
   * Upload file to S3 manually
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

      // Generate unique filename
      const uniqueSuffix = crypto.randomBytes(16).toString('hex');
      const extension = path.extname(originalName) || '.jpg';
      const key = `${this.folder}/${uniqueSuffix}${extension}`;

      // Upload to S3
      const command = new PutObjectCommand({
        Bucket: this.bucketName,
        Key: key,
        Body: fileBuffer,
        ContentType: mimeType,
        CacheControl: 'public, max-age=31536000', // Cache for 1 year
        Metadata: {
          originalName,
          uploadedBy: userId,
          uploadedAt: new Date().toISOString(),
        },
      });

      await this.s3Client.send(command);

      // Generate public URL
      let url = `https://${this.bucketName}.s3.${process.env.AWS_REGION || 'us-east-1'}.amazonaws.com/${key}`;
      
      // If CDN is configured, use CDN URL instead
      if (process.env.CDN_URL) {
        url = `${process.env.CDN_URL}/${key}`;
      }

      console.log(`[SUCCESS] Avatar uploaded successfully: ${url}`);

      return {
        success: true,
        url,
        key,
        bucket: this.bucketName,
        originalName,
        size: fileBuffer.length,
      };
    } catch (error) {
      console.error('[ERROR] Error uploading avatar to S3:', error);
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

