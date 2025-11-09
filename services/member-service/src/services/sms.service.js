const axios = require('axios');

class SMSService {
  constructor() {
    this.provider = process.env.SMS_PROVIDER || 'mock';
    this.esmsApiKey = process.env.ESMS_API_KEY;
    this.esmsSecretKey = process.env.ESMS_SECRET_KEY;
    this.esmsBrandname = process.env.ESMS_BRANDNAME;
    this.esmsApiUrl = 'https://rest.esms.vn/MainService.svc/json/SendMultipleMessage_V4_post/';
    this.initialize();
  }

  initialize() {
    if (this.provider === 'esms' && this.esmsApiKey && this.esmsSecretKey) {
      console.log('✅ SMS service (ESMS) initialized');
    } else {
      console.log('⚠️ SMS service will use mock mode');
    }
  }

  /**
   * Send SMS notification
   * @param {string} phoneNumber - Recipient phone number
   * @param {string} message - SMS message
   * @returns {Promise<Object>} Result of SMS sending
   */
  async sendSMS(phoneNumber, message) {
    try {
      if (this.provider === 'esms' && this.esmsApiKey && this.esmsSecretKey) {
        return await this.sendViaESMS(phoneNumber, message);
      } else {
        // Mock implementation
        console.log(`[MOCK SMS] To: ${phoneNumber}, Message: ${message}`);
        return {
          success: true,
          message: 'SMS sent (Mock)',
          mock: true,
        };
      }
    } catch (error) {
      console.error('❌ Send SMS error:', error);
      return {
        success: false,
        error: error.message || 'Failed to send SMS',
      };
    }
  }

  /**
   * Send SMS via ESMS
   */
  async sendViaESMS(phoneNumber, message) {
    try {
      const formData = new URLSearchParams();
      formData.append('ApiKey', this.esmsApiKey);
      formData.append('SecretKey', this.esmsSecretKey);
      formData.append('Phone', phoneNumber);
      formData.append('Content', message);
      formData.append('SmsType', '2'); // 2: tin nhắn chăm sóc khách hàng

      const response = await axios.post(this.esmsApiUrl, formData, {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
      });

      if (response.data.CodeResult === 100 || response.data.CodeResult === '100') {
        console.log(`✅ SMS sent to ${phoneNumber}`);
        return {
          success: true,
          message: 'SMS sent successfully',
          smsId: response.data.SMSID,
        };
      } else {
        console.error('❌ ESMS error:', response.data);
        return {
          success: false,
          error: response.data.ErrorMessage || 'ESMS API error',
        };
      }
    } catch (error) {
      console.error('❌ ESMS API error:', error);
      throw error;
    }
  }

  /**
   * Send SMS using template
   * @param {string} phoneNumber - Recipient phone number
   * @param {string} templateName - Template name
   * @param {Object} variables - Template variables
   * @returns {Promise<Object>} Result of SMS sending
   */
  async sendTemplateSMS(phoneNumber, templateName, variables = {}) {
    const template = this.getTemplate(templateName, variables);
    if (!template) {
      return {
        success: false,
        error: `Template "${templateName}" not found`,
      };
    }

    return await this.sendSMS(phoneNumber, template);
  }

  /**
   * Get SMS template with variables replaced
   */
  getTemplate(templateName, variables = {}) {
    const templates = {
      WORKOUT_REMINDER: `GYM147: Xin chao ${variables.member_name || 'Ban'}! Den luc tap luyen ${variables.workout_time || 'hom nay'}! Hay den phong gym va dat duoc muc tieu cua ban. 💪`,
      MEMBERSHIP_ALERT: `GYM147: Xin chao ${variables.member_name || 'Ban'}! ${variables.message || 'Co thong tin quan trong ve goi tap cua ban.'}`,
      ACHIEVEMENT: `GYM147: Chuc mung ${variables.member_name || 'Ban'}! Ban da mo khoa thanh tich "${variables.achievement_title || 'Thanh tich'}"! 🏆`,
      PAYMENT_SUCCESS: `GYM147: Thanh toan thanh cong! So tien: ${variables.amount || '0'} VND. Cam on ban da su dung dich vu! ✅`,
      PAYMENT_FAILED: `GYM147: Thanh toan khong thanh cong. Ly do: ${variables.reason || 'Vui long thu lai sau.'} ❌`,
      MEMBERSHIP_EXPIRING: `GYM147: Goi tap "${variables.membership_type || 'goi tap'}" cua ban se het han sau ${variables.days_left || '7'} ngay. Hay gia han som! ⏰`,
      EQUIPMENT_MAINTENANCE: `GYM147: ${variables.equipment_name || 'Mot so thiet bi'} se duoc bao tri trong thoi gian sap toi. Xin loi vi su bat tien nay. 🔧`,
    };

    const template = templates[templateName];
    if (!template) {
      return null;
    }

    // Replace variables
    let result = template;
    Object.keys(variables).forEach(key => {
      const regex = new RegExp(`{{${key}}}`, 'g');
      result = result.replace(regex, variables[key] || '');
    });

    return result;
  }
}

module.exports = new SMSService();

