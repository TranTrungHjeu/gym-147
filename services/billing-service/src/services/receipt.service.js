const PDFDocument = require('pdfkit');
const { v2: cloudinary } = require('cloudinary');

/**
 * Receipt Service - Generate and manage payment receipts
 */
class ReceiptService {
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
      console.warn('[WARNING] Cloudinary credentials not configured. Receipts will be generated but not stored.');
      this.isConfigured = false;
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
   * Upload receipt to Cloudinary
   * @param {Buffer} pdfBuffer - PDF buffer
   * @param {string} paymentId - Payment ID
   * @returns {Promise<string>} Cloudinary URL or null if not configured
   */
  async uploadToCloudinary(pdfBuffer, paymentId) {
    if (!this.isConfigured) {
      return null;
    }

    try {
      const publicId = `receipts/${paymentId}.pdf`;

      const uploadResult = await new Promise((resolve, reject) => {
        const uploadStream = cloudinary.uploader.upload_stream(
          {
            public_id: publicId,
            resource_type: 'raw', // PDF files
          },
          (error, result) => {
            if (error) return reject(error);
            resolve(result);
          }
        );
        uploadStream.end(pdfBuffer);
      });

      return uploadResult.secure_url;
    } catch (error) {
      console.error('Error uploading receipt to Cloudinary:', error);
      throw error;
    }
  }

  /**
   * Get receipt URL from Cloudinary (using known public_id logic)
   * @param {string} paymentId - Payment ID
   * @returns {Promise<string|null>} Cloudinary URL or null
   */
  async getReceiptUrl(paymentId) {
    if (!this.isConfigured) {
      return null;
    }

    try {
      // Cloudinary resources uploaded as "raw" don't have transformation URLs out of the box in the same way,
      // but they are public. We can just construct the URL if needed, or query it.
      // Usually the URL is static: https://res.cloudinary.com/<cloud_name>/raw/upload/v1/receipts/<paymentId>.pdf
      // Best to query the resource or assume it exists. For simplicity returning formatted URL.
      const url = cloudinary.url(`receipts/${paymentId}.pdf`, { resource_type: 'raw', secure: true });
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
    const url = await this.uploadToCloudinary(pdfBuffer, payment.id);

    return {
      buffer: pdfBuffer,
      url: url,
    };
  }
}

module.exports = new ReceiptService();

