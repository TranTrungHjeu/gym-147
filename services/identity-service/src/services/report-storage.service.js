const { S3Client, PutObjectCommand, GetObjectCommand } = require('@aws-sdk/client-s3');
const { getSignedUrl } = require('@aws-sdk/s3-request-presigner');

/**
 * Report Storage Service
 * Handles uploading reports to S3 and generating download URLs
 */
class ReportStorageService {
  constructor() {
    // Initialize S3 client if credentials are available
    if (
      process.env.AWS_ACCESS_KEY_ID &&
      process.env.AWS_SECRET_ACCESS_KEY &&
      process.env.AWS_S3_BUCKET_NAME
    ) {
      this.s3Client = new S3Client({
        region: process.env.AWS_REGION || 'ap-southeast-1',
        credentials: {
          accessKeyId: process.env.AWS_ACCESS_KEY_ID,
          secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
        },
      });
      this.bucketName = process.env.AWS_S3_BUCKET_NAME;
    } else {
      console.warn(
        '[WARNING] AWS S3 credentials not configured. Reports will be generated but not stored.'
      );
      this.s3Client = null;
    }
  }

  /**
   * Upload report to S3
   * @param {Buffer} fileBuffer - Report file buffer
   * @param {string} reportId - Scheduled report ID
   * @param {string} format - File format (PDF, EXCEL, CSV)
   * @param {string} reportType - Report type
   * @returns {Promise<string|null>} S3 URL or null if not configured
   */
  async uploadReport(fileBuffer, reportId, format, reportType) {
    if (!this.s3Client || !this.bucketName) {
      return null;
    }

    try {
      const extension = format.toLowerCase() === 'excel' ? 'xlsx' : format.toLowerCase();
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const key = `reports/${reportType.toLowerCase()}/${reportId}_${timestamp}.${extension}`;

      const command = new PutObjectCommand({
        Bucket: this.bucketName,
        Key: key,
        Body: fileBuffer,
        ContentType: this.getContentType(format),
        CacheControl: 'max-age=31536000', // 1 year
        Metadata: {
          reportId,
          reportType,
          format,
          generatedAt: new Date().toISOString(),
        },
      });

      await this.s3Client.send(command);

      // Generate presigned URL (valid for 1 year)
      const getCommand = new GetObjectCommand({
        Bucket: this.bucketName,
        Key: key,
      });

      const url = await getSignedUrl(this.s3Client, getCommand, {
        expiresIn: 31536000, // 1 year
      });

      console.log(`[SUCCESS] Report uploaded to S3: ${key}`);
      return url;
    } catch (error) {
      console.error('[ERROR] Error uploading report to S3:', error);
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
