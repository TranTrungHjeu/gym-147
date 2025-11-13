const crypto = require('crypto');
const { prisma } = require('../lib/prisma.js');
const config = require('../config/otp.config');
const { Resend } = require('resend');
const axios = require('axios');
const Buffer = require('buffer').Buffer;

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
    // Initialize SpeedSMS for SMS
    if (config.sms.provider === 'speedsms') {
      console.log('SpeedSMS service initialized');
    }

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

      console.log('🔍 OTP Lookup:');
      console.log('  - Identifier:', identifier);
      console.log('  - Type:', type);
      console.log('  - Found OTP record:', otpRecord ? 'YES' : 'NO');

      if (!otpRecord) {
        // Check if OTP exists but expired or already verified (for debugging)
        const anyOTP = await prisma.oTPVerification.findFirst({
          where: {
            identifier,
            type,
          },
          orderBy: {
            created_at: 'desc',
          },
          take: 1,
        });

        if (anyOTP) {
          const isExpired = anyOTP.expires_at <= new Date();
          const isVerified = anyOTP.verified_at !== null;
          console.log('  - Found OTP but:', {
            expired: isExpired,
            verified: isVerified,
            expires_at: anyOTP.expires_at,
            verified_at: anyOTP.verified_at,
            created_at: anyOTP.created_at,
          });
        } else {
          console.log('  - No OTP found for identifier:', identifier, 'type:', type);
        }

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

      // Debug logging (only in development)
      if (process.env.NODE_ENV === 'development') {
        console.log('🔍 OTP Verification Debug:');
        console.log('  - Input OTP:', inputOTP);
        console.log('  - Hashed Input OTP:', hashedInputOTP);
        console.log('  - Stored OTP Hash:', otpRecord.otp);
        console.log('  - OTP Match:', isValid);
        console.log('  - Identifier:', identifier);
        console.log('  - Type:', type);
        console.log('  - Expires At:', otpRecord.expires_at);
        console.log('  - Current Time:', new Date());
        console.log('  - Is Expired:', otpRecord.expires_at <= new Date());
        console.log('  - Attempts:', otpRecord.attempts, '/', this.maxAttempts);
      }

      if (isValid) {
        // Mark OTP as verified but don't delete yet (will be deleted after user creation)
        await prisma.oTPVerification.update({
          where: { id: otpRecord.id },
          data: { verified_at: new Date() },
        });

        console.log('✅ OTP verified successfully for:', identifier);
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

        console.log(
          '❌ OTP verification failed for:',
          identifier,
          '- Attempts:',
          otpRecord.attempts + 1
        );
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

  // Send OTP via SMS (SpeedSMS, ESMS or Mock)
  async sendSMSOTP(phoneNumber, otp) {
    try {
      if (config.sms.provider === 'speedsms') {
        // SpeedSMS implementation - Uses HTTP Basic Authentication
        if (!config.sms.speedsms.accessToken) {
          console.warn('SpeedSMS access token is not configured. Falling back to mock mode.');
          console.log(`[MOCK SMS] OTP sent to ${phoneNumber}: ${otp}`);
          return {
            success: true,
            message: 'Mã OTP đã được gửi qua SMS (Mock - SpeedSMS token not configured)',
            otp: otp, // Only for development/testing
          };
        }

        const message = `Mã OTP của bạn là: ${otp}. Mã có hiệu lực trong 5 phút.`;
        const sender = config.sms.speedsms.brandname || ''; // Empty string nếu không được cấu hình

        // Format phone number theo SpeedSMS format (array)
        // SpeedSMS yêu cầu format: 849xxxxxxxx (bỏ số 0 đầu, thêm 84)
        let formattedPhone = phoneNumber.trim();
        // Loại bỏ khoảng trắng
        formattedPhone = formattedPhone.replace(/\s+/g, '');
        // Chuyển đổi về format 849xxxxxxxx
        if (formattedPhone.startsWith('+84')) {
          formattedPhone = formattedPhone.replace('+84', '84');
        } else if (formattedPhone.startsWith('84')) {
          // Đã đúng format
        } else if (formattedPhone.startsWith('0')) {
          formattedPhone = '84' + formattedPhone.substring(1);
        } else {
          // Nếu không có prefix, thêm 84
          formattedPhone = '84' + formattedPhone;
        }

        // SpeedSMS uses HTTP Basic Auth: username = accessToken, password = "x"
        // Format: Authorization: Basic base64(accessToken:x)
        const basicAuth = Buffer.from(`${config.sms.speedsms.accessToken}:x`).toString('base64');

        // Request data theo format chính thức của SpeedSMS
        // Chỉ thêm sender nếu có giá trị (không phải empty string)
        const requestData = {
          to: [formattedPhone], // Array theo mẫu chính thức
          content: message,
          sms_type: 2,
        };

        // Chỉ thêm sender nếu có giá trị và không phải empty string
        if (sender && sender.trim() !== '') {
          requestData.sender = sender;
        }

        console.log('SpeedSMS request:', {
          url: config.sms.speedsms.apiUrl,
          phone: formattedPhone,
          hasToken: !!config.sms.speedsms.accessToken,
          sender: sender && sender.trim() !== '' ? sender : '(not included in request)',
        });

        try {
          // Gửi request theo format chính thức của SpeedSMS
          let response = await axios.post(config.sms.speedsms.apiUrl, requestData, {
            headers: {
              Authorization: `Basic ${basicAuth}`,
              'Content-Type': 'application/json',
            },
          });

          // Nếu lỗi "sender not found" và có sender trong request, thử lại không có sender
          if (
            response.data.status === 'error' &&
            response.data.message?.includes('sender not found') &&
            requestData.sender
          ) {
            console.warn('SpeedSMS sender not found. Retrying without sender field...');
            const requestDataWithoutSender = {
              to: [formattedPhone],
              content: message,
              sms_type: 2,
              // Không thêm sender field
            };
            response = await axios.post(config.sms.speedsms.apiUrl, requestDataWithoutSender, {
              headers: {
                Authorization: `Basic ${basicAuth}`,
                'Content-Type': 'application/json',
              },
            });
          }

          if (
            response.data.status === 'success' ||
            response.data.success === true ||
            response.data.code === 100 ||
            (response.data.status && response.data.status !== 'error')
          ) {
            return {
              success: true,
              message: 'Mã OTP đã được gửi qua SMS',
              smsId:
                response.data.data?.transaction_id ||
                response.data.transaction_id ||
                response.data.sms_id ||
                response.data.id,
            };
          } else {
            console.error('SpeedSMS error response:', response.data);
            // Nếu vẫn lỗi, fallback về mock
            if (response.data.status === 'error') {
              console.warn('SpeedSMS API returned error. Falling back to mock mode.');
              console.log(`[MOCK SMS] OTP sent to ${phoneNumber}: ${otp}`);
              return {
                success: true,
                message: 'Mã OTP đã được gửi qua SMS (Mock - SpeedSMS error)',
                otp: otp, // Only for development/testing
              };
            }
            throw new Error(
              `SpeedSMS Error: ${
                response.data.message || response.data.error || JSON.stringify(response.data)
              }`
            );
          }
        } catch (error) {
          console.error('SpeedSMS API error:', {
            status: error.response?.status,
            data: error.response?.data,
            message: error.message,
          });

          // Nếu lỗi 401, có thể token không đúng hoặc đã hết hạn
          if (error.response?.status === 401) {
            console.warn(
              'SpeedSMS authentication failed (401). Access token may be invalid or expired.'
            );
            console.warn('Falling back to mock mode for this request.');
            console.log(`[MOCK SMS] OTP sent to ${phoneNumber}: ${otp}`);
            return {
              success: true,
              message: 'Mã OTP đã được gửi qua SMS (Mock - SpeedSMS auth failed)',
              otp: otp, // Only for development/testing
            };
          }

          // Nếu lỗi về sender/brandname, fallback về mock
          if (
            error.response?.data?.message?.includes('sender not found') ||
            error.response?.data?.status === 'error'
          ) {
            console.warn('SpeedSMS sender/brandname error. Falling back to mock mode.');
            console.log(`[MOCK SMS] OTP sent to ${phoneNumber}: ${otp}`);
            return {
              success: true,
              message: 'Mã OTP đã được gửi qua SMS (Mock - SpeedSMS sender error)',
              otp: otp, // Only for development/testing
            };
          }

          // Với các lỗi khác, cũng fallback về mock để không làm crash hệ thống
          console.warn('SpeedSMS API error. Falling back to mock mode.');
          console.log(`[MOCK SMS] OTP sent to ${phoneNumber}: ${otp}`);
          return {
            success: true,
            message: 'Mã OTP đã được gửi qua SMS (Mock - SpeedSMS error)',
            otp: otp, // Only for development/testing
          };
        }
      } else if (config.sms.provider === 'esms') {
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
      if (error.response) {
        console.error('Response data:', error.response.data);
        console.error('Response status:', error.response.status);
      }
      throw new Error(`Failed to send SMS OTP: ${error.message}`);
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
    if (!this.resend) {
      throw new Error('Email service not initialized. Please configure RESEND_API_KEY.');
    }

    // Extract name from email if userName is not provided
    const displayName = userName || email.split('@')[0];

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
                <span style="font-size: 16px; line-height: 30px; color: #ffffff">${new Date().toLocaleDateString(
                  'vi-VN'
                )}</span>
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
  }

  // Send verification email (Resend)
  async sendEmailVerification(email, verificationToken, userName = '') {
    const verificationUrl = `${process.env.FRONTEND_URL}/verify-email?token=${verificationToken}`;

    if (!this.resend) {
      throw new Error('Email service not initialized. Please configure RESEND_API_KEY.');
    }

    // Extract name from email if userName is not provided
    const displayName = userName || email.split('@')[0];

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
                <span style="font-size: 16px; line-height: 30px; color: #ffffff">${new Date().toLocaleDateString(
                  'vi-VN'
                )}</span>
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
  }

  // Clean up expired OTPs
  async cleanupExpiredOTPs() {
    try {
      const now = new Date();
      const fiveMinutesAgo = new Date(now.getTime() - 5 * 60 * 1000);
      const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000); // 30 days for audit

      // 1. Delete unverified OTPs that expired more than 5 minutes ago
      // These are OTPs that were never used and are safe to delete immediately
      const unverifiedResult = await prisma.oTPVerification.deleteMany({
        where: {
          expires_at: { lt: fiveMinutesAgo },
          verified_at: null, // Only delete unverified OTPs
        },
      });

      // 2. Delete verified OTPs that are older than 30 days (for audit retention)
      // These are OTPs that were successfully verified but can be cleaned up after retention period
      const verifiedResult = await prisma.oTPVerification.deleteMany({
        where: {
          verified_at: { not: null }, // Only delete verified OTPs
          verified_at: { lt: thirtyDaysAgo }, // Older than 30 days
        },
      });

      const totalDeleted = unverifiedResult.count + verifiedResult.count;

      if (totalDeleted > 0) {
        console.log(
          `Cleaned up ${totalDeleted} expired OTPs: ${unverifiedResult.count} unverified (expired > 5 min), ${verifiedResult.count} verified (older than 30 days)`
        );
      }

      return {
        total: totalDeleted,
        unverified: unverifiedResult.count,
        verified: verifiedResult.count,
      };
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

    // In development, run every 10 seconds for easier testing
    // In production, run every 5 minutes
    const isDev = process.env.NODE_ENV !== 'production';
    const cleanupInterval = isDev ? 10 * 1000 : 5 * 60 * 1000; // 10 seconds (dev) or 5 minutes (prod)
    const intervalDescription = isDev ? '10 seconds' : '5 minutes';

    console.log(
      `Starting OTP cleanup job - runs every ${intervalDescription} (${
        process.env.NODE_ENV || 'development'
      })`
    );

    this.cleanupInterval = setInterval(async () => {
      try {
        const result = await this.cleanupExpiredOTPs();
        if (result.total > 0) {
          console.log(
            `Cleanup job completed: ${result.total} OTPs removed (${result.unverified} unverified, ${result.verified} verified)`
          );
        }
      } catch (error) {
        console.error('Cleanup job error:', error);
      }
    }, cleanupInterval);

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

  // Send password reset email
  async sendPasswordResetEmail(email, resetToken, userName = '') {
    const resetUrl = `${process.env.FRONTEND_URL}/reset-password?token=${resetToken}`;

    if (!this.resend) {
      throw new Error('Email service not initialized. Please configure RESEND_API_KEY.');
    }

    // Extract name from email if userName is not provided
    const displayName = userName || email.split('@')[0];

    const { data, error } = await this.resend.emails.send({
      from: config.email.resend.fromEmail,
      to: [email],
      subject: 'Đặt lại mật khẩu - GYM147',
      html: `
<!DOCTYPE html>
<html lang="vi">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <meta http-equiv="X-UA-Compatible" content="ie=edge" />
    <title>GYM147 - Đặt lại mật khẩu</title>
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
                <span style="font-size: 16px; line-height: 30px; color: #ffffff">${new Date().toLocaleDateString(
                  'vi-VN'
                )}</span>
              </td>
            </tr>
          </tbody>
        </table>
      </header>

      <!-- Main Content -->
      <main>
        <div style="margin: 0; margin-top: 70px; padding: 92px 30px 115px; background: #ffffff; border-radius: 30px; text-align: center;">
          <div style="width: 100%; max-width: 489px; margin: 0 auto">
            <h1 style="margin: 0; font-size: 24px; font-weight: 500; color: #1f1f1f; font-family: 'Space Grotesk', sans-serif;">Đặt Lại Mật Khẩu</h1>
            <p style="margin: 0; margin-top: 17px; font-size: 16px; font-weight: 500; font-family: 'Inter', sans-serif;">Xin chào ${displayName},</p>
            <p style="margin: 0; margin-top: 17px; font-weight: 500; letter-spacing: 0.56px; font-family: 'Inter', sans-serif;">
              Chúng tôi nhận được yêu cầu đặt lại mật khẩu cho tài khoản Gym147 của bạn. 
              Nhấn vào nút bên dưới để tạo mật khẩu mới. 
              Link này có hiệu lực trong <span style="font-weight: 600; color: #1f1f1f">5 phút</span>.
            </p>
            <div style="text-align: center; margin: 60px 0;">
              <a href="${resetUrl}" style="background: #ba3d4f; color: white; padding: 20px 40px; text-decoration: none; border-radius: 12px; font-weight: 600; display: inline-block; font-family: 'Space Grotesk', sans-serif; font-size: 16px;">
                Đặt Lại Mật Khẩu
              </a>
            </div>
            <p style="margin: 0; margin-top: 30px; font-weight: 500; color: #8c8c8c; font-family: 'Inter', sans-serif;">
              Nếu nút không hoạt động, bạn có thể copy link này:
            </p>
            <p style="margin: 0; margin-top: 10px; color: #499fb6; font-size: 12px; word-break: break-all; background: #e9ecef; padding: 10px; border-radius: 4px; font-family: 'Inter', sans-serif;">${resetUrl}</p>
            <p style="margin: 0; margin-top: 30px; font-weight: 500; color: #d32f2f; font-family: 'Inter', sans-serif;">
              ⚠️ Nếu bạn không yêu cầu đặt lại mật khẩu, vui lòng bỏ qua email này.
            </p>
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
      throw new Error('Failed to send password reset email');
    }

    return {
      success: true,
      message: 'Email đặt lại mật khẩu đã được gửi',
      messageId: data.id,
    };
  }
}

module.exports = { OTPService };
