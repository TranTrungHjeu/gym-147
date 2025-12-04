const { Resend } = require('resend');

/**
 * Report Email Service
 * Sends reports via email to recipients
 */
class ReportEmailService {
  constructor() {
    if (process.env.RESEND_API_KEY) {
      try {
        this.resend = new Resend(process.env.RESEND_API_KEY);
        console.log('[SUCCESS] Report Email service initialized');
      } catch (error) {
        console.error('[ERROR] Failed to initialize Resend:', error);
        this.resend = null;
      }
    } else {
      console.warn('[WARNING] RESEND_API_KEY not configured. Reports will not be sent via email.');
      this.resend = null;
    }

    this.fromEmail = process.env.RESEND_FROM_EMAIL || 'noreply@gym147.com';
  }

  /**
   * Send report via email
   * @param {Array<string>} recipients - Email recipients
   * @param {string} reportName - Report name
   * @param {string} reportType - Report type
   * @param {string} format - File format
   * @param {Buffer} fileBuffer - Report file buffer
   * @param {string} downloadUrl - Optional download URL
   * @returns {Promise<Object>} Send result
   */
  async sendReport(recipients, reportName, reportType, format, fileBuffer, downloadUrl = null) {
    if (!this.resend) {
      return {
        success: false,
        error: 'Email service not initialized. Please configure RESEND_API_KEY.',
      };
    }

    if (!recipients || recipients.length === 0) {
      return {
        success: false,
        error: 'No recipients specified',
      };
    }

    try {
      const extension = format.toLowerCase() === 'excel' ? 'xlsx' : format.toLowerCase();
      const filename = `${reportName.replace(/[^a-z0-9]/gi, '_')}_${
        new Date().toISOString().split('T')[0]
      }.${extension}`;

      // Prepare email content
      const subject = `Báo cáo ${reportName} - Gym147`;
      const html = this.generateEmailHTML(reportName, reportType, format, downloadUrl);

      // Send email with attachment
      const { data, error } = await this.resend.emails.send({
        from: this.fromEmail,
        to: recipients,
        subject,
        html,
        attachments: [
          {
            filename,
            content: fileBuffer.toString('base64'),
            type: this.getContentType(format),
          },
        ],
      });

      if (error) {
        console.error('[ERROR] Resend error:', error);
        return {
          success: false,
          error: error.message || 'Failed to send email',
        };
      }

      console.log(`[SUCCESS] Report email sent to ${recipients.length} recipient(s)`);
      return {
        success: true,
        messageId: data?.id,
        recipients: recipients.length,
      };
    } catch (error) {
      console.error('[ERROR] Error sending report email:', error);
      return {
        success: false,
        error: error.message || 'Unknown error',
      };
    }
  }

  /**
   * Generate email HTML content
   * @param {string} reportName - Report name
   * @param {string} reportType - Report type
   * @param {string} format - File format
   * @param {string} downloadUrl - Optional download URL
   * @returns {string} HTML content
   */
  generateEmailHTML(reportName, reportType, format, downloadUrl) {
    return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Báo cáo ${reportName}</title>
</head>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="background: linear-gradient(135deg, #ff6b35 0%, #f7931e 100%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
    <h1 style="color: white; margin: 0; font-size: 28px;">Gym147</h1>
  </div>
  
  <div style="background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px;">
    <h2 style="color: #ff6b35; margin-top: 0;">Báo cáo ${reportName}</h2>
    
    <p>Xin chào,</p>
    
    <p>Báo cáo <strong>${reportName}</strong> đã được tạo thành công.</p>
    
    <div style="background: white; padding: 20px; border-radius: 5px; margin: 20px 0; border-left: 4px solid #ff6b35;">
      <p style="margin: 5px 0;"><strong>Loại báo cáo:</strong> ${reportType}</p>
      <p style="margin: 5px 0;"><strong>Định dạng:</strong> ${format.toUpperCase()}</p>
      <p style="margin: 5px 0;"><strong>Thời gian tạo:</strong> ${new Date().toLocaleString(
        'vi-VN'
      )}</p>
    </div>
    
    <p>Báo cáo đã được đính kèm trong email này. Bạn có thể tải xuống và xem chi tiết.</p>
    
    ${
      downloadUrl
        ? `<p><a href="${downloadUrl}" style="display: inline-block; background: #ff6b35; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; margin: 20px 0;">Tải xuống từ liên kết</a></p>`
        : ''
    }
    
    <p style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #ddd; color: #666; font-size: 12px;">
      Đây là email tự động từ hệ thống Gym147. Vui lòng không trả lời email này.
    </p>
  </div>
  
  <div style="text-align: center; margin-top: 20px; color: #999; font-size: 12px;">
    <p>&copy; ${new Date().getFullYear()} Gym147. All rights reserved.</p>
  </div>
</body>
</html>
    `;
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

module.exports = new ReportEmailService();
