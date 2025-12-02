const { Resend } = require('resend');

class EmailService {
  constructor() {
    this.resend = null;
    this.fromEmail = process.env.RESEND_FROM_EMAIL || 'noreply@gym147.com';
    this.initialize();
  }

  initialize() {
    const apiKey = process.env.RESEND_API_KEY;
    if (apiKey) {
      try {
        this.resend = new Resend(apiKey);
        console.log('[SUCCESS] Email service (Resend) initialized');
      } catch (error) {
        console.error('[ERROR] Failed to initialize Resend:', error);
      }
    } else {
      console.log('[WARNING] RESEND_API_KEY not set, email service will use mock mode');
    }
  }

  /**
   * Send email notification
   * @param {string} to - Recipient email
   * @param {string} subject - Email subject
   * @param {string} html - HTML content
   * @param {string} text - Plain text content (optional)
   * @returns {Promise<Object>} Result of email sending
   */
  async sendEmail(to, subject, html, text = null) {
    try {
      if (!this.resend) {
        console.log(`[MOCK EMAIL] To: ${to}, Subject: ${subject}`);
        return {
          success: true,
          message: 'Email sent (Mock)',
          mock: true,
        };
      }

      const { data, error } = await this.resend.emails.send({
        from: this.fromEmail,
        to: [to],
        subject,
        html,
        text: text || this.stripHtml(html),
      });

      if (error) {
        console.error('[ERROR] Resend error:', error);
        return {
          success: false,
          error: error.message || 'Failed to send email',
        };
      }

      console.log(`[SUCCESS] Email sent to ${to}: ${subject}`);
      return {
        success: true,
        messageId: data.id,
        message: 'Email sent successfully',
      };
    } catch (error) {
      console.error('[ERROR] Send email error:', error);
      return {
        success: false,
        error: error.message || 'Failed to send email',
      };
    }
  }

  /**
   * Send email using template
   * @param {string} to - Recipient email
   * @param {string} templateName - Template name
   * @param {Object} variables - Template variables
   * @returns {Promise<Object>} Result of email sending
   */
  async sendTemplateEmail(to, templateName, variables = {}) {
    const template = this.getTemplate(templateName, variables);
    if (!template) {
      return {
        success: false,
        error: `Template "${templateName}" not found`,
      };
    }

    return await this.sendEmail(to, template.subject, template.html, template.text);
  }

  /**
   * Get email template with variables replaced
   */
  getTemplate(templateName, variables = {}) {
    const templates = {
      WORKOUT_REMINDER: {
        subject: '[STRENGTH] Nhắc nhở tập luyện - GYM147',
        html: this.getWorkoutReminderTemplate(variables),
      },
      MEMBERSHIP_ALERT: {
        subject: '[WARNING] Thông báo gói tập - GYM147',
        html: this.getMembershipAlertTemplate(variables),
      },
      ACHIEVEMENT: {
        subject: '[TROPHY] Thành tích mới - GYM147',
        html: this.getAchievementTemplate(variables),
      },
      PROMOTIONAL: {
        subject: '[CELEBRATE] Ưu đãi đặc biệt - GYM147',
        html: this.getPromotionalTemplate(variables),
      },
      EQUIPMENT_MAINTENANCE: {
        subject: '[CONFIG] Bảo trì thiết bị - GYM147',
        html: this.getEquipmentMaintenanceTemplate(variables),
      },
      PAYMENT_SUCCESS: {
        subject: '[SUCCESS] Thanh toán thành công - GYM147',
        html: this.getPaymentSuccessTemplate(variables),
      },
      PAYMENT_FAILED: {
        subject: '[ERROR] Thanh toán thất bại - GYM147',
        html: this.getPaymentFailedTemplate(variables),
      },
      MEMBERSHIP_EXPIRING: {
        subject: '[TIMER] Gói tập sắp hết hạn - GYM147',
        html: this.getMembershipExpiringTemplate(variables),
      },
    };

    return templates[templateName] || null;
  }

  /**
   * Replace variables in template
   */
  replaceVariables(template, variables) {
    let result = template;
    Object.keys(variables).forEach(key => {
      const regex = new RegExp(`{{${key}}}`, 'g');
      result = result.replace(regex, variables[key] || '');
    });
    return result;
  }

  /**
   * Strip HTML tags for plain text version
   */
  stripHtml(html) {
    return html
      .replace(/<[^>]*>/g, '')
      .replace(/\s+/g, ' ')
      .trim();
  }

  // Template methods
  getWorkoutReminderTemplate(variables) {
    const memberName = variables.member_name || 'Bạn';
    const workoutTime = variables.workout_time || 'hôm nay';
    return this.getBaseEmailTemplate(
      '[STRENGTH] Nhắc nhở tập luyện',
      `
        <p>Xin chào <strong>${memberName}</strong>,</p>
        <p>Đã đến lúc tập luyện ${workoutTime}! Hãy đến phòng gym và đạt được mục tiêu của bạn.</p>
        <p style="margin-top: 20px;"><strong>Chúc bạn có một buổi tập hiệu quả! [STRENGTH]</strong></p>
      `
    );
  }

  getMembershipAlertTemplate(variables) {
    const memberName = variables.member_name || 'Bạn';
    const membershipType = variables.membership_type || 'gói tập';
    const message = variables.message || 'Có thông tin quan trọng về gói tập của bạn.';
    return this.getBaseEmailTemplate(
      '[WARNING] Thông báo gói tập',
      `
        <p>Xin chào <strong>${memberName}</strong>,</p>
        <p>${message}</p>
        <p><strong>Gói tập:</strong> ${membershipType}</p>
      `
    );
  }

  getAchievementTemplate(variables) {
    const memberName = variables.member_name || 'Bạn';
    const achievementTitle = variables.achievement_title || 'Thành tích';
    const achievementDescription = variables.achievement_description || '';
    return this.getBaseEmailTemplate(
      '[TROPHY] Thành tích mới',
      `
        <p>Xin chào <strong>${memberName}</strong>,</p>
        <p>Chúc mừng! Bạn đã mở khóa thành tích:</p>
        <h2 style="color: #ba3d4f;">${achievementTitle}</h2>
        ${achievementDescription ? `<p>${achievementDescription}</p>` : ''}
      `
    );
  }

  getPromotionalTemplate(variables) {
    const memberName = variables.member_name || 'Bạn';
    const offerContent = variables.offer_content || 'Ưu đãi đặc biệt dành cho bạn!';
    return this.getBaseEmailTemplate(
      '[CELEBRATE] Ưu đãi đặc biệt',
      `
        <p>Xin chào <strong>${memberName}</strong>,</p>
        <p>${offerContent}</p>
      `
    );
  }

  getEquipmentMaintenanceTemplate(variables) {
    const memberName = variables.member_name || 'Bạn';
    const equipmentName = variables.equipment_name || 'một số thiết bị';
    return this.getBaseEmailTemplate(
      '[CONFIG] Bảo trì thiết bị',
      `
        <p>Xin chào <strong>${memberName}</strong>,</p>
        <p>${equipmentName} sẽ được bảo trì trong thời gian sắp tới. Chúng tôi xin lỗi vì sự bất tiện này.</p>
      `
    );
  }

  getPaymentSuccessTemplate(variables) {
    const memberName = variables.member_name || 'Bạn';
    const amount = variables.amount || '0';
    const paymentMethod = variables.payment_method || '';
    return this.getBaseEmailTemplate(
      '[SUCCESS] Thanh toán thành công',
      `
        <p>Xin chào <strong>${memberName}</strong>,</p>
        <p>Thanh toán của bạn đã được xử lý thành công!</p>
        <p><strong>Số tiền:</strong> ${amount} VNĐ</p>
        ${paymentMethod ? `<p><strong>Phương thức:</strong> ${paymentMethod}</p>` : ''}
      `
    );
  }

  getPaymentFailedTemplate(variables) {
    const memberName = variables.member_name || 'Bạn';
    const reason = variables.reason || 'Vui lòng thử lại sau.';
    return this.getBaseEmailTemplate(
      '[ERROR] Thanh toán thất bại',
      `
        <p>Xin chào <strong>${memberName}</strong>,</p>
        <p>Thanh toán của bạn không thành công.</p>
        <p><strong>Lý do:</strong> ${reason}</p>
        <p>Vui lòng kiểm tra lại thông tin thanh toán hoặc liên hệ hỗ trợ.</p>
      `
    );
  }

  getMembershipExpiringTemplate(variables) {
    const memberName = variables.member_name || 'Bạn';
    const daysLeft = variables.days_left || '7';
    const membershipType = variables.membership_type || 'gói tập';
    return this.getBaseEmailTemplate(
      '[TIMER] Gói tập sắp hết hạn',
      `
        <p>Xin chào <strong>${memberName}</strong>,</p>
        <p>Gói tập <strong>${membershipType}</strong> của bạn sẽ hết hạn sau <strong>${daysLeft} ngày</strong>.</p>
        <p>Hãy gia hạn sớm để tiếp tục sử dụng dịch vụ!</p>
      `
    );
  }

  /**
   * Base email template with GYM147 branding
   */
  getBaseEmailTemplate(title, content) {
    return `
<!DOCTYPE html>
<html lang="vi">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${title} - GYM147</title>
</head>
<body style="margin: 0; font-family: 'Inter', 'Space Grotesk', sans-serif; background: #ffffff; font-size: 14px;">
  <div style="max-width: 680px; margin: 0 auto; padding: 45px 30px 60px; background: #f4f7ff; font-size: 14px; color: #434343;">
    <header>
      <table style="width: 100%">
        <tbody>
          <tr>
            <td>
              <img alt="Gym147 Logo" src="https://i.postimg.cc/VNq14wJc/Black-and-Red-Bold-Gym-You-Tube-Channel-Logo.png" height="50px" />
            </td>
          </tr>
        </tbody>
      </table>
    </header>
    <main>
      <div style="margin: 0; margin-top: 30px; padding: 40px 30px; background: #ffffff; border-radius: 30px;">
        <h1 style="margin: 0; font-size: 24px; font-weight: 500; color: #1f1f1f; font-family: 'Space Grotesk', sans-serif;">${title}</h1>
        <div style="margin-top: 20px; color: #434343; line-height: 1.6;">
          ${content}
        </div>
      </div>
    </main>
    <footer style="width: 100%; max-width: 490px; margin: 20px auto 0; text-align: center; border-top: 1px solid #e6ebf1; padding-top: 20px;">
      <p style="margin: 0; font-size: 16px; font-weight: 600; color: #434343; font-family: 'Space Grotesk', sans-serif;">Gym147</p>
      <p style="margin: 0; margin-top: 8px; color: #434343; font-family: 'Inter', sans-serif;">Hệ thống quản lý phòng gym chuyên nghiệp</p>
      <p style="margin: 0; margin-top: 16px; color: #434343; font-family: 'Inter', sans-serif;">Copyright © 2024 Gym147. Tất cả quyền được bảo lưu.</p>
    </footer>
  </div>
</body>
</html>
    `;
  }
}

module.exports = new EmailService();
