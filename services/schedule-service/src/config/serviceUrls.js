if (!process.env.MEMBER_SERVICE_URL) {
  throw new Error('MEMBER_SERVICE_URL environment variable is required. Please set it in your .env file.');
}

if (!process.env.IDENTITY_SERVICE_URL) {
  throw new Error('IDENTITY_SERVICE_URL environment variable is required. Please set it in your .env file.');
}

const MEMBER_SERVICE_URL = process.env.MEMBER_SERVICE_URL;
const IDENTITY_SERVICE_URL = process.env.IDENTITY_SERVICE_URL;

module.exports = {
  MEMBER_SERVICE_URL,
  IDENTITY_SERVICE_URL,
};
