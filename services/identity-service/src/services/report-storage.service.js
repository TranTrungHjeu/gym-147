const { v2: cloudinary } = require('cloudinary');

/**
 * Report Storage Service
 * Handles uploading reports to Cloudinary and generating download URLs
 */
class ReportStorageService {
  constructor() {
    // Initialize Cloudinary client if credentials are available
    if (
      process.env.CLOUDINARY_CLOUD_NAME &&
      process.env.CLOUDINARY_API_KEY &&
      process.env.CLOUDINARY_API_SECRET
    ) {
      cloudinary.config({
        cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
        api_key: process.env.CLOUDINARY_API_KEY,
        api_secret: process.env.CLOUDINARY_API_SECRET,
      });
      this.isConfigured = true;
    } else {
      console.warn(
        '[WARNING] Cloudinary credentials not configured. Reports will be generated but not stored.'
      );
      this.isConfigured = false;
    }
  }

  /**
   * Upload report to Cloudinary
   * @param {Buffer} fileBuffer - Report file buffer
   * @param {string} reportId - Report ID (can be any report type)
   * @param {string} format - File format (PDF, EXCEL, CSV)
   * @param {string} reportType - Report type
   * @returns {Promise<string|null>} Cloudinary URL or null if not configured
   */
  async uploadReport(fileBuffer, reportId, format, reportType) {
    if (!this.isConfigured) {
      return null;
    }

    try {
      const extension = format.toLowerCase() === 'excel' ? 'xlsx' : format.toLowerCase();
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      // For raw files on Cloudinary, the secure_url preserves the provided public_id logic mostly
      const publicId = `reports/${reportType.toLowerCase()}/${reportId}_${timestamp}.${extension}`;

      const uploadResult = await new Promise((resolve, reject) => {
        const uploadStream = cloudinary.uploader.upload_stream(
          {
            public_id: publicId,
            resource_type: 'raw', // Important for PDF, CSV, Excel
            metadata: {
              report_id: reportId,
              report_type: reportType,
              format: format,
            }
          },
          (error, result) => {
            if (error) return reject(error);
            resolve(result);
          }
        );
        uploadStream.end(fileBuffer);
      });

      console.log(`[SUCCESS] Report uploaded to Cloudinary: ${uploadResult.secure_url}`);
      return uploadResult.secure_url;
    } catch (error) {
      console.error('[ERROR] Error uploading report to Cloudinary:', error);
      throw error;
    }
  }

  /**
   * Get content type for file format
   * @param {string} format - File format
   * @returns {string} Content type
   */
  getContentType(format) {
    const contentTypes = {
      PDF: 'application/pdf',
      EXCEL: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      CSV: 'text/csv',
    };
    return contentTypes[format.toUpperCase()] || 'application/octet-stream';
  }
}

module.exports = new ReportStorageService();
