const MEMBER_SERVICE_URL = process.env.MEMBER_SERVICE_URL || 'http://localhost:3002';
const IDENTITY_SERVICE_URL = process.env.IDENTITY_SERVICE_URL || 'http://localhost:3001';

module.exports = {
  MEMBER_SERVICE_URL,
  IDENTITY_SERVICE_URL,
};
