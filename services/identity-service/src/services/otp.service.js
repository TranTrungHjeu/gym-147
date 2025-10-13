const crypto = require('crypto');
const { prisma } = require('../lib/prisma.js');
const config = require('../config/otp.config');
const { Resend } = require('resend');
const axios = require('axios');

class OTPService {
  constructor() {
    this.otpExpiry = 5 * 60 * 1000; // 5 minutes
    this.maxAttempts = 3;
    this.cleanupInterval = null; // Store cleanup interval reference

    // Initialize services based on config
    this.initializeServices();
  }

  // Initialize SMS and Email services based on configuration
  initializeServices() {
    // Initialize ESMS for SMS
    if (config.sms.provider === 'esms') {
      console.log('ESMS SMS service initialized');
    }

    // Initialize Resend for Email
    if (config.email.provider === 'resend') {
      try {
        this.resend = new Resend(config.email.resend.apiKey);
        console.log('Resend Email service initialized');
      } catch (error) {
        console.error('Failed to initialize Resend:', error);
      }
    }
  }

  // Generate 6-digit OTP
  generateOTP() {
    return crypto.randomInt(100000, 999999).toString();
  }

  // Generate verification token
  generateVerificationToken() {
    return crypto.randomBytes(32).toString('hex');
  }

  // Store OTP in database
  async storeOTP(identifier, otp, type = 'PHONE') {
    try {
      // Delete existing UNVERIFIED OTP for this identifier
      await prisma.oTPVerification.deleteMany({
        where: {
          identifier,
          verified_at: null, // Only delete unverified OTPs
        },
      });

      // Create new OTP record
      const otpRecord = await prisma.oTPVerification.create({
        data: {
          identifier,
          otp: await this.hashOTP(otp),
          type,
          expires_at: new Date(Date.now() + this.otpExpiry),
          attempts: 0,
        },
      });

      return otpRecord;
    } catch (error) {
      console.error('Error storing OTP:', error);
      throw new Error('Failed to store OTP');
    }
  }

  // Hash OTP for secure storage
  async hashOTP(otp) {
    const crypto = require('crypto');
    return crypto.createHash('sha256').update(otp).digest('hex');
  }

  // Verify OTP
  async verifyOTP(identifier, inputOTP, type = 'PHONE') {
    try {
      console.log('Verifying OTP for:', identifier, 'type:', type, 'otp:', inputOTP);

      // First check if there's already a verified OTP for this identifier
      const verifiedOTP = await prisma.oTPVerification.findFirst({
        where: {
          identifier,
          type,
          expires_at: { gt: new Date() },
          verified_at: { not: null }, // Already verified
        },
      });

      if (verifiedOTP) {
        console.log('Found already verified OTP');
        return {
          success: true,
          message: 'OTP đã được xác thực trước đó',
          data: { identifier, type, verified: true },
        };
      }

      // Look for unverified OTP
      const otpRecord = await prisma.oTPVerification.findFirst({
        where: {
          identifier,
          type,
          expires_at: { gt: new Date() },
          verified_at: null, // Only accept unverified OTPs for verification
        },
      });
      console.log('Found OTP record:', otpRecord ? 'YES' : 'NO');

      if (!otpRecord) {
        return {
          success: false,
          message: 'OTP không tồn tại hoặc đã hết hạn',
          remainingAttempts: 0,
        };
      }

      // Check if max attempts exceeded
      if (otpRecord.attempts >= this.maxAttempts) {
        await prisma.oTPVerification.delete({
          where: { id: otpRecord.id },
        });
        return {
          success: false,
          message: 'Đã vượt quá số lần thử tối đa. Vui lòng yêu cầu OTP mới',
          remainingAttempts: 0,
        };
      }

      // Verify OTP
      const hashedInputOTP = await this.hashOTP(inputOTP);
      const isValid = hashedInputOTP === otpRecord.otp;

      if (isValid) {
        // Mark OTP as verified but don't delete yet (will be deleted after user creation)
        await prisma.oTPVerification.update({
          where: { id: otpRecord.id },
          data: { verified_at: new Date() },
        });

        return {
          success: true,
          message: 'Xác thực thành công',
        };
      } else {
        // Increment attempts
        await prisma.oTPVerification.update({
          where: { id: otpRecord.id },
          data: { attempts: otpRecord.attempts + 1 },
        });

        return {
          success: false,
          message: 'Mã OTP không đúng',
          remainingAttempts: this.maxAttempts - (otpRecord.attempts + 1),
        };
      }
    } catch (error) {
      console.error('Error verifying OTP:', error);
      throw new Error('Failed to verify OTP');
    }
  }

  // Send OTP via SMS (ESMS or Mock)
  async sendSMSOTP(phoneNumber, otp) {
    try {
      if (config.sms.provider === 'esms') {
        // Real ESMS implementation - Sử dụng form-data thay vì JSON
        const formData = new URLSearchParams();
        formData.append('ApiKey', config.sms.esms.apiKey);
        formData.append('SecretKey', config.sms.esms.secretKey);
        formData.append('Phone', phoneNumber);
        formData.append('Content', `Mã OTP của bạn là: ${otp}. Mã có hiệu lực trong 5 phút.`);
        formData.append('SmsType', '1'); // 2: tin nhắn chăm sóc khách hàng
        // formData.append('Brandname', config.sms.esms.brandname);

        const response = await axios.post(config.sms.esms.apiUrl, formData, {
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
          },
        });

        if (response.data.CodeResult === 100 || response.data.CodeResult === '100') {
          return {
            success: true,
            message: 'Mã OTP đã được gửi qua SMS',
            smsId: response.data.SMSID,
          };
        } else {
          console.error('ESMS error:', response.data);
          throw new Error(`ESMS Error: ${response.data.ErrorMessage || 'Unknown error'}`);
        }
      } else {
        // Mock implementation
        console.log(`[MOCK SMS] OTP sent to ${phoneNumber}: ${otp}`);
        return {
          success: true,
          message: 'Mã OTP đã được gửi qua SMS (Mock)',
          otp: otp, // Only for development/testing
        };
      }
    } catch (error) {
      console.error('Error sending SMS OTP:', error);
      throw new Error('Failed to send SMS OTP');
    }
  }

  // Send OTP (main method)
  async sendOTP(identifier, type = 'PHONE', userName = '') {
    try {
      const otp = this.generateOTP();

      // Store OTP in database
      await this.storeOTP(identifier, otp, type);

      // Send OTP based on type
      if (type === 'PHONE') {
        return await this.sendSMSOTP(identifier, otp);
      } else if (type === 'EMAIL') {
        return await this.sendEmailOTP(identifier, otp, userName);
      } else {
        throw new Error('Invalid OTP type');
      }
    } catch (error) {
      console.error('Error sending OTP:', error);
      throw new Error('Failed to send OTP');
    }
  }

  // Send OTP via Email (Resend)
  async sendEmailOTP(email, otp, userName = '') {
    try {
      if (config.email.provider === 'resend' && this.resend) {
        // Extract name from email if userName is not provided
        const displayName = userName || email.split('@')[0];

        // Real Resend implementation
        const { data, error } = await this.resend.emails.send({
          from: config.email.resend.fromEmail,
          to: [email],
          subject: 'Mã OTP xác thực tài khoản - GYM147',
          html: `
<!DOCTYPE html>
<html lang="vi">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <meta http-equiv="X-UA-Compatible" content="ie=edge" />
    <title>GYM147 - Mã OTP</title>
    <link href="https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@300;400;500;600;700&family=Inter:wght@300;400;500;600;700&display=swap" rel="stylesheet" />
  </head>
  <body style="margin: 0; font-family: 'Inter', 'Space Grotesk', sans-serif; background: #ffffff; font-size: 14px;">
    <div style="max-width: 680px; margin: 0 auto; padding: 45px 30px 60px; background: #f4f7ff; background-image: url('https://i.postimg.cc/dtP6cK19/Orange-Geometic-Modern-Zoom-Virtual-Background.png'); background-repeat: no-repeat; background-size: 800px 452px; background-position: top center; font-size: 14px; color: #434343;">
      
      <!-- Header -->
      <header>
        <table style="width: 100%">
          <tbody>
            <tr style="height: 0">
              <td>
                <img alt="Gym147 Logo" src="https://i.postimg.cc/VNq14wJc/Black-and-Red-Bold-Gym-You-Tube-Channel-Logo.png" height="50px" />
              </td>
              <td style="text-align: right">
                <span style="font-size: 16px; line-height: 30px; color: #ffffff">${new Date().toLocaleDateString('vi-VN')}</span>
              </td>
            </tr>
          </tbody>
        </table>
      </header>

      <!-- Main Content -->
      <main>
        <div style="margin: 0; margin-top: 70px; padding: 92px 30px 115px; background: #ffffff; border-radius: 30px; text-align: center;">
          <div style="width: 100%; max-width: 489px; margin: 0 auto">
            <h1 style="margin: 0; font-size: 24px; font-weight: 500; color: #1f1f1f; font-family: 'Space Grotesk', sans-serif;">Mã OTP Xác Thực</h1>
            <p style="margin: 0; margin-top: 17px; font-size: 16px; font-weight: 500; font-family: 'Inter', sans-serif;">Xin chào ${displayName},</p>
            <p style="margin: 0; margin-top: 17px; font-weight: 500; letter-spacing: 0.56px; font-family: 'Inter', sans-serif;">
              Cảm ơn bạn đã chọn Gym147. Sử dụng mã OTP sau để hoàn tất quá trình xác thực tài khoản. 
              Mã OTP có hiệu lực trong <span style="font-weight: 600; color: #1f1f1f">5 phút</span>. 
              Không chia sẻ mã này với người khác, kể cả nhân viên Gym147.
            </p>
            <p style="margin: 0; margin-top: 60px; font-size: 40px; font-weight: 600; letter-spacing: 25px; color: #ba3d4f; font-family: 'Space Grotesk', sans-serif;">${otp}</p>
          </div>
        </div>

        <p style="max-width: 400px; margin: 0 auto; margin-top: 90px; text-align: center; font-weight: 500; color: #8c8c8c; font-family: 'Inter', sans-serif;">
          Cần hỗ trợ? Liên hệ tại 
          <a href="mailto:support@gym147.com" style="color: #499fb6; text-decoration: none">support@gym147.com</a> 
          hoặc truy cập 
          <a href="https://gym147.com/help" target="_blank" style="color: #499fb6; text-decoration: none">Trung tâm trợ giúp</a>
        </p>
      </main>

      <!-- Footer -->
      <footer style="width: 100%; max-width: 490px; margin: 20px auto 0; text-align: center; border-top: 1px solid #e6ebf1;">
        <p style="margin: 0; margin-top: 40px; font-size: 16px; font-weight: 600; color: #434343; font-family: 'Space Grotesk', sans-serif;">Gym147</p>
        <p style="margin: 0; margin-top: 8px; color: #434343; font-family: 'Inter', sans-serif;">Hệ thống quản lý phòng gym chuyên nghiệp</p>
        <div style="margin: 0; margin-top: 16px">
          <a href="https://facebook.com/gym147" target="_blank" style="display: inline-block">
            <img width="36px" alt="Facebook" src="https://archisketch-resources.s3.ap-northeast-2.amazonaws.com/vrstyler/1661502815169_682499/email-template-icon-facebook" />
          </a>
          <a href="https://instagram.com/gym147" target="_blank" style="display: inline-block; margin-left: 8px">
            <img width="36px" alt="Instagram" src="https://archisketch-resources.s3.ap-northeast-2.amazonaws.com/vrstyler/1661504218208_684135/email-template-icon-instagram" />
          </a>
          <a href="https://youtube.com/gym147" target="_blank" style="display: inline-block; margin-left: 8px">
            <img width="36px" alt="Youtube" src="https://archisketch-resources.s3.ap-northeast-2.amazonaws.com/vrstyler/1661503195931_210869/email-template-icon-youtube" />
          </a>
        </div>
        <p style="margin: 0; margin-top: 16px; color: #434343; font-family: 'Inter', sans-serif;">Copyright © 2024 Gym147. Tất cả quyền được bảo lưu.</p>
      </footer>
    </div>
  </body>
</html>
          `,
        });

        if (error) {
          console.error('Resend error:', error);
          throw new Error('Failed to send email');
        }

        return {
          success: true,
          message: 'Mã OTP đã được gửi qua email',
          messageId: data.id,
        };
      } else {
        // Mock implementation for development/testing
        console.log(`[MOCK EMAIL] OTP sent to ${email}: ${otp}`);
        return {
          success: true,
          message: 'Mã OTP đã được gửi qua email (Mock)',
          otp: otp, // Only for development/testing
        };
      }
    } catch (error) {
      console.error('Error sending email OTP:', error);
      throw new Error('Failed to send email OTP');
    }
  }

  // Send verification email (Resend)
  async sendEmailVerification(email, verificationToken, userName = '') {
    try {
      const verificationUrl = `${process.env.FRONTEND_URL}/verify-email?token=${verificationToken}`;

      if (config.email.provider === 'resend' && this.resend) {
        // Extract name from email if userName is not provided
        const displayName = userName || email.split('@')[0];

        // Real Resend implementation
        const { data, error } = await this.resend.emails.send({
          from: config.email.resend.fromEmail,
          to: [email],
          subject: 'Xác thực email tài khoản - Gym147',
          html: `
<!DOCTYPE html>
<html lang="vi">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <meta http-equiv="X-UA-Compatible" content="ie=edge" />
    <title>Gym147 - Xác thực Email</title>
    <link href="https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@300;400;500;600;700&family=Inter:wght@300;400;500;600;700&display=swap" rel="stylesheet" />
  </head>
  <body style="margin: 0; font-family: 'Inter', 'Space Grotesk', sans-serif; background: #ffffff; font-size: 14px;">
    <div style="max-width: 680px; margin: 0 auto; padding: 45px 30px 60px; background: #f4f7ff; background-image: url('https://i.postimg.cc/dtP6cK19/Orange-Geometic-Modern-Zoom-Virtual-Background.png'); background-repeat: no-repeat; background-size: 800px 452px; background-position: top center; font-size: 14px; color: #434343;">
      
      <!-- Header -->
      <header>
        <table style="width: 100%">
          <tbody>
            <tr style="height: 0">
              <td>
                <img alt="Gym147 Logo" src="https://gym147.com/assets/images/logo.png" height="50px" />
              </td>
              <td style="text-align: right">
                <span style="font-size: 16px; line-height: 30px; color: #ffffff">${new Date().toLocaleDateString('vi-VN')}</span>
              </td>
            </tr>
          </tbody>
        </table>
      </header>

      <!-- Main Content -->
      <main>
        <div style="margin: 0; margin-top: 70px; padding: 92px 30px 115px; background: #ffffff; border-radius: 30px; text-align: center;">
          <div style="width: 100%; max-width: 489px; margin: 0 auto">
            <h1 style="margin: 0; font-size: 24px; font-weight: 500; color: #1f1f1f; font-family: 'Space Grotesk', sans-serif;">Xác Thực Email</h1>
            <p style="margin: 0; margin-top: 17px; font-size: 16px; font-weight: 500; font-family: 'Inter', sans-serif;">Xin chào ${displayName},</p>
            <p style="margin: 0; margin-top: 17px; font-weight: 500; letter-spacing: 0.56px; font-family: 'Inter', sans-serif;">
              Vui lòng nhấn vào nút bên dưới để xác thực email của bạn và hoàn tất quá trình đăng ký tài khoản.
            </p>
            <div style="text-align: center; margin: 60px 0;">
              <a href="${verificationUrl}" style="background: #ba3d4f; color: white; padding: 20px 40px; text-decoration: none; border-radius: 12px; font-weight: 600; display: inline-block; font-family: 'Space Grotesk', sans-serif; font-size: 16px;">
                Xác Thực Email
              </a>
            </div>
            <p style="margin: 0; margin-top: 30px; font-weight: 500; color: #8c8c8c; font-family: 'Inter', sans-serif;">
              Nếu nút không hoạt động, bạn có thể copy link này:
            </p>
            <p style="margin: 0; margin-top: 10px; color: #499fb6; font-size: 12px; word-break: break-all; background: #e9ecef; padding: 10px; border-radius: 4px; font-family: 'Inter', sans-serif;">${verificationUrl}</p>
          </div>
        </div>

        <p style="max-width: 400px; margin: 0 auto; margin-top: 90px; text-align: center; font-weight: 500; color: #8c8c8c; font-family: 'Inter', sans-serif;">
          Cần hỗ trợ? Liên hệ tại 
          <a href="mailto:support@gym147.com" style="color: #499fb6; text-decoration: none">support@gym147.com</a> 
          hoặc truy cập 
          <a href="https://gym147.com/help" target="_blank" style="color: #499fb6; text-decoration: none">Trung tâm trợ giúp</a>
        </p>
      </main>

      <!-- Footer -->
      <footer style="width: 100%; max-width: 490px; margin: 20px auto 0; text-align: center; border-top: 1px solid #e6ebf1;">
        <p style="margin: 0; margin-top: 40px; font-size: 16px; font-weight: 600; color: #434343; font-family: 'Space Grotesk', sans-serif;">Gym147</p>
        <p style="margin: 0; margin-top: 8px; color: #434343; font-family: 'Inter', sans-serif;">Hệ thống quản lý phòng gym chuyên nghiệp</p>
        <div style="margin: 0; margin-top: 16px">
          <a href="https://facebook.com/gym147" target="_blank" style="display: inline-block">
            <img width="36px" alt="Facebook" src="https://archisketch-resources.s3.ap-northeast-2.amazonaws.com/vrstyler/1661502815169_682499/email-template-icon-facebook" />
          </a>
          <a href="https://instagram.com/gym147" target="_blank" style="display: inline-block; margin-left: 8px">
            <img width="36px" alt="Instagram" src="https://archisketch-resources.s3.ap-northeast-2.amazonaws.com/vrstyler/1661504218208_684135/email-template-icon-instagram" />
          </a>
          <a href="https://youtube.com/gym147" target="_blank" style="display: inline-block; margin-left: 8px">
            <img width="36px" alt="Youtube" src="https://archisketch-resources.s3.ap-northeast-2.amazonaws.com/vrstyler/1661503195931_210869/email-template-icon-youtube" />
          </a>
        </div>
        <p style="margin: 0; margin-top: 16px; color: #434343; font-family: 'Inter', sans-serif;">Copyright © 2024 Gym147. Tất cả quyền được bảo lưu.</p>
      </footer>
    </div>
  </body>
</html>
          `,
        });

        if (error) {
          console.error('Resend error:', error);
          throw new Error('Failed to send email');
        }

        return {
          success: true,
          message: 'Email xác thực đã được gửi',
          messageId: data.id,
        };
      } else {
        // Mock implementation for development/testing
        console.log(`[MOCK EMAIL] Verification email sent to ${email}: ${verificationUrl}`);
        return {
          success: true,
          message: 'Email xác thực đã được gửi (Mock)',
          verificationUrl: verificationUrl, // Only for development/testing
        };
      }
    } catch (error) {
      console.error('Error sending verification email:', error);
      throw new Error('Failed to send verification email');
    }
  }

  // Clean up expired OTPs
  async cleanupExpiredOTPs() {
    try {
      // Delete OTPs that expired more than 5 minutes ago (keep recent ones for audit)
      const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);

      const result = await prisma.oTPVerification.deleteMany({
        where: {
          expires_at: { lt: fiveMinutesAgo },
        },
      });

      console.log(`Cleaned up ${result.count} expired OTPs (older than 5 minutes)`);
      return result.count;
    } catch (error) {
      console.error('Error cleaning up expired OTPs:', error);
      throw new Error('Failed to cleanup expired OTPs');
    }
  }

  // Start cleanup job
  startCleanupJob() {
    if (this.cleanupInterval) {
      console.log('Cleanup job already running');
      return;
    }

    console.log('Starting OTP cleanup job - runs every 5 minutes');

    this.cleanupInterval = setInterval(
      async () => {
        try {
          const cleanedCount = await this.cleanupExpiredOTPs();
          console.log(`Cleanup job completed: ${cleanedCount} OTPs removed`);
        } catch (error) {
          console.error('Cleanup job error:', error);
        }
      },
      5 * 60 * 1000
    ); // Run every 5 minutes

    // Run cleanup immediately on start
    this.cleanupExpiredOTPs().catch(error => {
      console.error('Initial cleanup error:', error);
    });
  }

  // Stop cleanup job
  stopCleanupJob() {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
      console.log('OTP cleanup job stopped');
    }
  }

  // Get OTP status
  async getOTPStatus(identifier, type = 'PHONE') {
    try {
      const otpRecord = await prisma.oTPVerification.findFirst({
        where: {
          identifier,
          type,
          expires_at: { gt: new Date() },
        },
      });

      if (!otpRecord) {
        return {
          exists: false,
          remainingAttempts: this.maxAttempts,
          expiresAt: null,
        };
      }

      return {
        exists: true,
        remainingAttempts: this.maxAttempts - otpRecord.attempts,
        expiresAt: otpRecord.expires_at,
      };
    } catch (error) {
      console.error('Error getting OTP status:', error);
      throw new Error('Failed to get OTP status');
    }
  }
}

module.exports = { OTPService };
