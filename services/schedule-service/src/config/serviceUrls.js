// Auto-detect service URLs based on environment
// If running in Docker (DOCKER_ENV=true), check if services are also in Docker
// If services are on host machine, use host.docker.internal (Windows/Mac) or host IP
const isDocker = process.env.DOCKER_ENV === 'true';

// If MEMBER_SERVICE_URL is explicitly set, use it
// Otherwise, auto-detect based on environment
let MEMBER_SERVICE_URL = process.env.MEMBER_SERVICE_URL;
if (!MEMBER_SERVICE_URL) {
  if (isDocker) {
    // Check if member-service is also in Docker (via service name)
    // If not accessible, try host.docker.internal for Windows/Mac
    // or use service name if in same Docker network
    MEMBER_SERVICE_URL = 'http://member:3002'; // Try Docker service name first
  } else {
    MEMBER_SERVICE_URL = 'http://localhost:3002';
  }
} else if (
  isDocker &&
  (MEMBER_SERVICE_URL.includes('localhost') || MEMBER_SERVICE_URL.includes('127.0.0.1'))
) {
  // If in Docker but URL contains localhost or 127.0.0.1,
  // replace with host.docker.internal to access host machine services
  console.warn(
    '⚠️ MEMBER_SERVICE_URL contains localhost/127.0.0.1 but DOCKER_ENV=true, replacing with host.docker.internal'
  );
  // Use host.docker.internal for Windows/Mac Docker Desktop
  // For Linux, might need to use host machine IP
  MEMBER_SERVICE_URL = MEMBER_SERVICE_URL.replace(/localhost:3002/g, 'host.docker.internal:3002');
  MEMBER_SERVICE_URL = MEMBER_SERVICE_URL.replace(
    /127\.0\.0\.1:3002/g,
    'host.docker.internal:3002'
  );
}

let IDENTITY_SERVICE_URL = process.env.IDENTITY_SERVICE_URL;
if (!IDENTITY_SERVICE_URL) {
  if (isDocker) {
    IDENTITY_SERVICE_URL = 'http://identity:3001'; // Try Docker service name first
  } else {
    IDENTITY_SERVICE_URL = 'http://localhost:3001';
  }
} else if (
  isDocker &&
  (IDENTITY_SERVICE_URL.includes('localhost') || IDENTITY_SERVICE_URL.includes('127.0.0.1'))
) {
  // If in Docker but URL contains localhost or 127.0.0.1,
  // replace with host.docker.internal to access host machine services
  console.warn(
    '⚠️ IDENTITY_SERVICE_URL contains localhost/127.0.0.1 but DOCKER_ENV=true, replacing with host.docker.internal'
  );
  IDENTITY_SERVICE_URL = IDENTITY_SERVICE_URL.replace(
    /localhost:3001/g,
    'host.docker.internal:3001'
  );
  IDENTITY_SERVICE_URL = IDENTITY_SERVICE_URL.replace(
    /127\.0\.0\.1:3001/g,
    'host.docker.internal:3001'
  );
}

console.log('🔧 Service URLs configured:', {
  DOCKER_ENV: process.env.DOCKER_ENV,
  isDocker,
  MEMBER_SERVICE_URL,
  IDENTITY_SERVICE_URL,
  'process.env.MEMBER_SERVICE_URL': process.env.MEMBER_SERVICE_URL,
  'process.env.IDENTITY_SERVICE_URL': process.env.IDENTITY_SERVICE_URL,
});

module.exports = {
  MEMBER_SERVICE_URL,
  IDENTITY_SERVICE_URL,
};
