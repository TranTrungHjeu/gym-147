// Role-based Access Control Middleware
// Hierarchy: SUPER_ADMIN > ADMIN > TRAINER > MEMBER

const roleHierarchy = {
  SUPER_ADMIN: 4,
  ADMIN: 3,
  TRAINER: 2,
  MEMBER: 1,
};

// Kiểm tra role có quyền tạo role khác không
const canCreateRole = (currentRole, targetRole) => {
  const currentLevel = roleHierarchy[currentRole];
  const targetLevel = roleHierarchy[targetRole];

  // SUPER_ADMIN có thể tạo ADMIN
  if (currentRole === 'SUPER_ADMIN' && targetRole === 'ADMIN') {
    return true;
  }

  // SUPER_ADMIN và ADMIN có thể tạo TRAINER
  if (['SUPER_ADMIN', 'ADMIN'].includes(currentRole) && targetRole === 'TRAINER') {
    return true;
  }

  // Tất cả đều có thể tạo MEMBER (public registration)
  if (targetRole === 'MEMBER') {
    return true;
  }

  return false;
};

// Middleware kiểm tra quyền tạo user với role cụ thể
const requireRoleCreation = targetRole => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required',
        data: null,
      });
    }

    const currentRole = req.user.role;

    if (!canCreateRole(currentRole, targetRole)) {
      return res.status(403).json({
        success: false,
        message: `Insufficient permissions. Role ${currentRole} cannot create ${targetRole} accounts`,
        data: null,
      });
    }

    next();
  };
};

// Middleware kiểm tra quyền admin (SUPER_ADMIN hoặc ADMIN)
const requireAdmin = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      message: 'Authentication required',
      data: null,
    });
  }

  if (!['SUPER_ADMIN', 'ADMIN'].includes(req.user.role)) {
    return res.status(403).json({
      success: false,
      message: 'Admin access required',
      data: null,
    });
  }

  next();
};

// Middleware kiểm tra quyền SUPER_ADMIN
const requireSuperAdmin = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      message: 'Authentication required',
      data: null,
    });
  }

  if (req.user.role !== 'SUPER_ADMIN') {
    return res.status(403).json({
      success: false,
      message: 'Super admin access required',
      data: null,
    });
  }

  next();
};

// Middleware kiểm tra quyền staff (SUPER_ADMIN, ADMIN, TRAINER)
const requireStaff = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      message: 'Authentication required',
      data: null,
    });
  }

  if (!['SUPER_ADMIN', 'ADMIN', 'TRAINER'].includes(req.user.role)) {
    return res.status(403).json({
      success: false,
      message: 'Staff access required',
      data: null,
    });
  }

  next();
};

// Middleware kiểm tra role cụ thể
const requireRole = allowedRoles => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required',
        data: null,
      });
    }

    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: 'Insufficient permissions',
        data: null,
      });
    }

    next();
  };
};

module.exports = {
  roleHierarchy,
  canCreateRole,
  requireRoleCreation,
  requireAdmin,
  requireSuperAdmin,
  requireStaff,
  requireRole,
};
