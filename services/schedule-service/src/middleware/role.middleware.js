/**
 * Role-based authorization middleware
 * Requires user to be authenticated and have one of the specified roles
 */
const requireRole = allowedRoles => {
  return (req, res, next) => {
    if (!req.user || !req.user.id) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required',
        data: null,
      });
    }

    if (!req.user.role || !allowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: 'Insufficient permissions',
        data: null,
      });
    }

    next();
  };
};

module.exports = { requireRole };

