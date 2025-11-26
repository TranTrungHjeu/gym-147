const config = {
  // SMS Configuration
  sms: {
    // In production, SMS_PROVIDER must be set (no 'mock' fallback)
    provider: process.env.SMS_PROVIDER || (process.env.NODE_ENV === 'production' ? null : 'mock'),
    speedsms: {
      accessToken: process.env.SPEEDSMS_ACCESS_TOKEN,
      apiUrl: process.env.SPEEDSMS_API_URL || 'https://api.speedsms.vn/index.php/sms/send',
      brandname: process.env.SPEEDSMS_BRANDNAME || null, // Không set brandname mặc định, để SpeedSMS tự chọn
    },
    esms: {
      apiKey: process.env.ESMS_API_KEY,
      secretKey: process.env.ESMS_SECRET_KEY,
      brandname: process.env.ESMS_BRANDNAME,
      apiUrl: process.env.ESMS_API_URL || 'https://rest.esms.vn/MainService.svc/json/SendMultipleMessage_V4_post/',
    },
    // Comment out other SMS providers
    // twilio: {
    //   accountSid: process.env.TWILIO_ACCOUNT_SID,
    //   authToken: process.env.TWILIO_AUTH_TOKEN,
    //   phoneNumber: process.env.TWILIO_PHONE_NUMBER,
    // },
  },

  // Email Configuration
  email: {
    // In production, EMAIL_PROVIDER must be set (no 'mock' fallback)
    provider: process.env.EMAIL_PROVIDER || (process.env.NODE_ENV === 'production' ? null : 'mock'),
    resend: {
      apiKey: process.env.RESEND_API_KEY,
      fromEmail: process.env.RESEND_FROM_EMAIL,
      apiUrl: process.env.RESEND_API_URL || 'https://api.resend.com',
    },
    // Comment out other email providers
    // sendgrid: {
    //   apiKey: process.env.SENDGRID_API_KEY,
    //   fromEmail: process.env.SENDGRID_FROM_EMAIL,
    // },
  },
};

module.exports = config;
