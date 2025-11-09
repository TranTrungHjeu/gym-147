const PDFDocument = require('pdfkit');
const { S3Client, PutObjectCommand, GetObjectCommand } = require('@aws-sdk/client-s3');
const { getSignedUrl } = require('@aws-sdk/s3-request-presigner');

/**
 * Receipt Service - Generate and manage payment receipts
 */
class ReceiptService {
  constructor() {
    // Initialize S3 client if credentials are available
    if (
      process.env.AWS_ACCESS_KEY_ID &&
      process.env.AWS_SECRET_ACCESS_KEY &&
      process.env.AWS_S3_BUCKET
    ) {
      this.s3Client = new S3Client({
        region: process.env.AWS_REGION || 'ap-southeast-1',
        credentials: {
          accessKeyId: process.env.AWS_ACCESS_KEY_ID,
          secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
        },
      });
      this.bucketName = process.env.AWS_S3_BUCKET;
    } else {
      console.warn('⚠️ AWS S3 credentials not configured. Receipts will be generated but not stored.');
      this.s3Client = null;
    }
  }

  /**
   * Generate PDF receipt for a payment
   * @param {Object} payment - Payment object with related data
   * @param {Object} member - Member information (optional)
   * @returns {Promise<Buffer>} PDF buffer
   */
  async generateReceipt(payment, member = null) {
    return new Promise((resolve, reject) => {
      try {
        const doc = new PDFDocument({
          size: 'A4',
          margin: 50,
        });

        const chunks = [];

        doc.on('data', (chunk) => chunks.push(chunk));
        doc.on('end', () => {
          const pdfBuffer = Buffer.concat(chunks);
          resolve(pdfBuffer);
        });
        doc.on('error', reject);

        // Header
        doc
          .fontSize(24)
          .font('Helvetica-Bold')
          .text('GYM-147', { align: 'center' })
          .fontSize(14)
          .font('Helvetica')
          .text('Payment Receipt', { align: 'center' })
          .moveDown(2);

        // Receipt Number
        doc
          .fontSize(12)
          .font('Helvetica-Bold')
          .text(`Receipt #: ${payment.id.substring(0, 8).toUpperCase()}`)
          .font('Helvetica')
          .text(`Date: ${new Date(payment.created_at).toLocaleDateString('vi-VN')}`)
          .text(
            `Time: ${new Date(payment.created_at).toLocaleTimeString('vi-VN')}`
          )
          .moveDown();

        // Member Information (if available)
        if (member) {
          doc
            .fontSize(12)
            .font('Helvetica-Bold')
            .text('Member Information:')
            .font('Helvetica')
            .text(`Name: ${member.full_name || 'N/A'}`)
            .text(`Email: ${member.email || 'N/A'}`)
            .text(`Phone: ${member.phone || 'N/A'}`)
            .moveDown();
        }

        // Payment Details
        doc
          .fontSize(12)
          .font('Helvetica-Bold')
          .text('Payment Details:')
          .font('Helvetica')
          .text(`Payment ID: ${payment.id}`)
          .text(`Amount: ${this.formatCurrency(payment.amount, payment.currency || 'VND')}`)
          .text(`Status: ${payment.status}`)
          .text(`Payment Method: ${payment.payment_method || 'N/A'}`)
          .text(`Payment Type: ${payment.payment_type || 'N/A'}`);

        if (payment.transaction_id) {
          doc.text(`Transaction ID: ${payment.transaction_id}`);
        }

        if (payment.processed_at) {
          doc.text(
            `Processed: ${new Date(payment.processed_at).toLocaleString('vi-VN')}`
          );
        }

        doc.moveDown();

        // Subscription Information (if available)
        if (payment.subscription && payment.subscription.plan) {
          doc
            .fontSize(12)
            .font('Helvetica-Bold')
            .text('Subscription Details:')
            .font('Helvetica')
            .text(`Plan: ${payment.subscription.plan.name}`)
            .text(`Type: ${payment.subscription.plan.type}`)
            .text(`Duration: ${payment.subscription.plan.duration_months} months`)
            .moveDown();
        }

        // Description
        if (payment.description) {
          doc
            .fontSize(12)
            .font('Helvetica-Bold')
            .text('Description:')
            .font('Helvetica')
            .text(payment.description)
            .moveDown();
        }

        // Footer
        doc
          .fontSize(10)
          .font('Helvetica')
          .text(
            'This is an official receipt. Please keep it for your records.',
            { align: 'center' }
          )
          .moveDown()
          .text('Thank you for your business!', { align: 'center' })
          .text(
            `Generated on: ${new Date().toLocaleString('vi-VN')}`,
            { align: 'center' }
          );

        doc.end();
      } catch (error) {
        reject(error);
      }
    });
  }

  /**
   * Upload receipt to S3
   * @param {Buffer} pdfBuffer - PDF buffer
   * @param {string} paymentId - Payment ID
   * @returns {Promise<string>} S3 URL or null if not configured
   */
  async uploadToS3(pdfBuffer, paymentId) {
    if (!this.s3Client || !this.bucketName) {
      return null;
    }

    try {
      const key = `receipts/${paymentId}.pdf`;

      const command = new PutObjectCommand({
        Bucket: this.bucketName,
        Key: key,
        Body: pdfBuffer,
        ContentType: 'application/pdf',
        CacheControl: 'max-age=31536000', // 1 year
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

      return url;
    } catch (error) {
      console.error('Error uploading receipt to S3:', error);
      throw error;
    }
  }

  /**
   * Get receipt URL from S3
   * @param {string} paymentId - Payment ID
   * @returns {Promise<string|null>} Presigned URL or null
   */
  async getReceiptUrl(paymentId) {
    if (!this.s3Client || !this.bucketName) {
      return null;
    }

    try {
      const key = `receipts/${paymentId}.pdf`;

      const command = new GetObjectCommand({
        Bucket: this.bucketName,
        Key: key,
      });

      // Generate presigned URL (valid for 1 hour)
      const url = await getSignedUrl(this.s3Client, command, {
        expiresIn: 3600, // 1 hour
      });

      return url;
    } catch (error) {
      // File doesn't exist or other error
      return null;
    }
  }

  /**
   * Format currency
   * @param {number} amount - Amount
   * @param {string} currency - Currency code
   * @returns {string} Formatted currency string
   */
  formatCurrency(amount, currency = 'VND') {
    const formatter = new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency: currency,
    });
    return formatter.format(amount);
  }

  /**
   * Generate and upload receipt
   * @param {Object} payment - Payment object
   * @param {Object} member - Member object (optional)
   * @returns {Promise<{buffer: Buffer, url: string|null}>}
   */
  async generateAndUploadReceipt(payment, member = null) {
    const pdfBuffer = await this.generateReceipt(payment, member);
    const url = await this.uploadToS3(pdfBuffer, payment.id);

    return {
      buffer: pdfBuffer,
      url: url,
    };
  }
}

module.exports = new ReceiptService();

