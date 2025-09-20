const jwt = require('jsonwebtoken');
const { authService } = require('../services/auth.prisma.service.js');

// Middleware to verify JWT token
async function authenticateToken(req, res, next) {
  try {
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'Access token required',
        data: null
      });
    }

    const user = await authService.verifyToken(token);
    
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid or expired token',
        data: null
      });
    }

    req.user = user;
    next();
  } catch (error) {
    return res.status(401).json({
      success: false,
      message: 'Invalid token',
      data: null
    });
  }
}

// Middleware to check if user has specific role
function requireRole(roles) {
  return (req, res, next) => {
    const userRole = req.user?.role;
    
    if (!userRole || !roles.includes(userRole)) {
      return res.status(403).json({
        success: false,
        message: 'Insufficient permissions',
        data: null
      });
    }
    
    next();
  };
}

// Middleware to check if user is admin
const requireAdmin = requireRole(['admin']);

// Middleware to check if user is staff or admin
const requireStaff = requireRole(['admin', 'staff']);

module.exports = {
  authenticateToken,
  requireRole,
  requireAdmin,
  requireStaff
};