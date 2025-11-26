const jwt = require('jsonwebtoken');
const redisService = require('../services/redis.service.js');
const { prisma } = require('../lib/prisma.js');

const authMiddleware = async (req, res, next) => {
  try {
    // Get token from header
    const authHeader = req.header('Authorization');

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        message: 'Access denied. No valid token provided.',
        data: null,
      });
    }

    // Extract token (remove 'Bearer ' prefix)
    const token = authHeader.substring(7);

    // Verify token
    const jwtSecret = process.env.JWT_SECRET;
    if (!jwtSecret) {
      console.error('JWT_SECRET is not set in environment variables');
      return res.status(500).json({
        success: false,
        message: 'Server configuration error',
        data: null,
      });
    }
    const decoded = jwt.verify(token, jwtSecret);

    // Check session in Redis first (if sessionId exists)
    if (decoded.sessionId) {
      const session = await redisService.getSession(decoded.sessionId);
      
      if (session) {
        // Session exists in Redis, use it
        req.user = decoded;
        return next();
      } else {
        // Session not in Redis, check database (fallback)
        try {
          const dbSession = await prisma.session.findUnique({
            where: { id: decoded.sessionId },
          });

          if (dbSession && dbSession.expires_at > new Date()) {
            // Session exists in DB, restore to Redis
            const sessionData = {
              id: dbSession.id,
              user_id: dbSession.user_id,
              token: dbSession.token,
              refresh_token: dbSession.refresh_token,
              device_info: dbSession.device_info,
              ip_address: dbSession.ip_address,
              user_agent: dbSession.user_agent,
              expires_at: dbSession.expires_at.toISOString(),
              created_at: dbSession.created_at.toISOString(),
            };
            const ttl = Math.floor((dbSession.expires_at - new Date()) / 1000);
            if (ttl > 0) {
              await redisService.setSession(dbSession.id, sessionData, ttl);
            }
            req.user = decoded;
            return next();
          } else {
            // Session expired or not found
            return res.status(401).json({
              success: false,
              message: 'Session expired or invalid',
              data: null,
            });
          }
        } catch (dbError) {
          console.error('Error checking session in database:', dbError);
          // Continue with decoded token if DB check fails
        }
      }
    }

    // Add user info to request object
    req.user = decoded;

    next();
  } catch (error) {
    console.error('Auth middleware error:', error);

    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        success: false,
        message: 'Token expired',
        data: null,
      });
    }

    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({
        success: false,
        message: 'Invalid token',
        data: null,
      });
    }

    res.status(500).json({
      success: false,
      message: 'Internal server error',
      data: null,
    });
  }
};

module.exports = { authMiddleware };
