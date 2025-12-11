const jwt = require('jsonwebtoken');

/**
 * Simple authentication middleware
 * Extracts user info from JWT token in Authorization header
 */
const authenticateToken = (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

    if (!token) {
      // If no token, continue without user (for public endpoints)
      // Controllers can check req.user to determine if authenticated
      req.user = null;
      return next();
    }

    // Verify token (use JWT_SECRET from environment)
    const secret = process.env.JWT_SECRET || process.env.IDENTITY_SERVICE_JWT_SECRET;
    
    try {
      let decoded;
      
      if (!secret) {
        // If no secret, decode without verification (for development only)
        // WARNING: This is not secure and should only be used in development
        console.warn('[WARN] JWT_SECRET not set, decoding token without verification (development mode)');
        decoded = jwt.decode(token);
        if (!decoded) {
          req.user = null;
          return next();
        }
      } else {
        // Verify token with secret
        decoded = jwt.verify(token, secret);
      }
      
      req.user = {
        id: decoded.userId || decoded.id || decoded.user_id,
        role: decoded.role,
        email: decoded.email,
      };
    } catch (error) {
      // Invalid token, continue without user
      console.error('[ERROR] Token verification/decoding failed:', error.message);
      req.user = null;
    }

    next();
  } catch (error) {
    console.error('[ERROR] Auth middleware error:', error);
    req.user = null;
    next();
  }
};

module.exports = { authenticateToken };

