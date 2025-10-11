const crypto = require('crypto');
const { prisma } = require('../lib/prisma.js');

class OTPService {
  constructor() {
    this.otpExpiry = 5 * 60 * 1000; // 5 minutes
    this.maxAttempts = 3;
    this.cleanupInterval = null; // Store cleanup interval reference
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

  // Send OTP via SMS (mock implementation)
  async sendSMSOTP(phoneNumber, otp) {
    try {
      // TODO: Integrate with real SMS service (Twilio, AWS SNS, etc.)
      console.log(`SMS OTP sent to ${phoneNumber}: ${otp}`);

      // Mock SMS sending
      return {
        success: true,
        message: 'Mã OTP đã được gửi qua SMS',
        otp: otp, // Only for development/testing
      };
    } catch (error) {
      console.error('Error sending SMS OTP:', error);
      throw new Error('Failed to send SMS OTP');
    }
  }

  // Send OTP (main method)
  async sendOTP(identifier, type = 'PHONE') {
    try {
      const otp = this.generateOTP();

      // Store OTP in database
      await this.storeOTP(identifier, otp, type);

      // Send OTP based on type
      if (type === 'PHONE') {
        return await this.sendSMSOTP(identifier, otp);
      } else if (type === 'EMAIL') {
        return await this.sendEmailOTP(identifier, otp);
      } else {
        throw new Error('Invalid OTP type');
      }
    } catch (error) {
      console.error('Error sending OTP:', error);
      throw new Error('Failed to send OTP');
    }
  }

  // Send OTP via Email (mock implementation)
  async sendEmailOTP(email, otp) {
    try {
      // TODO: Integrate with real email service (SendGrid, AWS SES, etc.)
      console.log(`Email OTP sent to ${email}: ${otp}`);

      // Mock email sending
      return {
        success: true,
        message: 'Mã OTP đã được gửi qua email',
        otp: otp, // Only for development/testing
      };
    } catch (error) {
      console.error('Error sending email OTP:', error);
      throw new Error('Failed to send email OTP');
    }
  }

  // Send verification email (mock implementation)
  async sendEmailVerification(email, verificationToken) {
    try {
      // TODO: Integrate with real email service (SendGrid, AWS SES, etc.)
      const verificationUrl = `${process.env.FRONTEND_URL}/verify-email?token=${verificationToken}`;

      console.log(`Email verification sent to ${email}: ${verificationUrl}`);

      // Mock email sending
      return {
        success: true,
        message: 'Email xác thực đã được gửi',
        verificationUrl: verificationUrl, // Only for development/testing
      };
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
