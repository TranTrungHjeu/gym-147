const config = {
  // SMS Configuration
  sms: {
    provider: process.env.SMS_PROVIDER || 'mock', // 'esms', 'mock'
    esms: {
      apiKey: process.env.ESMS_API_KEY,
      secretKey: process.env.ESMS_SECRET_KEY,
      brandname: process.env.ESMS_BRANDNAME,
      apiUrl: 'https://rest.esms.vn/MainService.svc/json/SendMultipleMessage_V4_post/',
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
    provider: process.env.EMAIL_PROVIDER || 'mock', // 'resend', 'mock'
    resend: {
      apiKey: process.env.RESEND_API_KEY,
      fromEmail: process.env.RESEND_FROM_EMAIL,
    },
    // Comment out other email providers
    // sendgrid: {
    //   apiKey: process.env.SENDGRID_API_KEY,
    //   fromEmail: process.env.SENDGRID_FROM_EMAIL,
    // },
  },
};

module.exports = config;
