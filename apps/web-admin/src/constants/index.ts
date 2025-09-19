// API endpoints
export const API_ENDPOINTS = {
  IDENTITY: '/identity',
  MEMBER: '/member',
  SCHEDULE: '/schedule',
  BILLING: '/billing',
} as const;

// Member status options
export const MEMBER_STATUS = {
  ACTIVE: 'ACTIVE',
  EXPIRED: 'EXPIRED',
  SUSPENDED: 'SUSPENDED',
} as const;

export const MEMBER_STATUS_LABELS = {
  [MEMBER_STATUS.ACTIVE]: 'Đang hoạt động',
  [MEMBER_STATUS.EXPIRED]: 'Hết hạn',
  [MEMBER_STATUS.SUSPENDED]: 'Tạm ngưng',
};

// User roles
export const USER_ROLES = {
  ADMIN: 'ADMIN',
  CASHIER: 'CASHIER', 
  TRAINER: 'TRAINER',
  MEMBER: 'MEMBER',
} as const;

export const USER_ROLE_LABELS = {
  [USER_ROLES.ADMIN]: 'Quản trị viên',
  [USER_ROLES.CASHIER]: 'Thu ngân',
  [USER_ROLES.TRAINER]: 'Huấn luyện viên',
  [USER_ROLES.MEMBER]: 'Hội viên',
};

// Invoice status
export const INVOICE_STATUS = {
  PAID: 'PAID',
  UNPAID: 'UNPAID',
  OVERDUE: 'OVERDUE',
} as const;

export const INVOICE_STATUS_LABELS = {
  [INVOICE_STATUS.PAID]: 'Đã thanh toán',
  [INVOICE_STATUS.UNPAID]: 'Chưa thanh toán',
  [INVOICE_STATUS.OVERDUE]: 'Quá hạn',
};

// Schedule status
export const SCHEDULE_STATUS = {
  SCHEDULED: 'SCHEDULED',
  ONGOING: 'ONGOING',
  COMPLETED: 'COMPLETED',
  CANCELLED: 'CANCELLED',
} as const;

export const SCHEDULE_STATUS_LABELS = {
  [SCHEDULE_STATUS.SCHEDULED]: 'Đã lên lịch',
  [SCHEDULE_STATUS.ONGOING]: 'Đang diễn ra',
  [SCHEDULE_STATUS.COMPLETED]: 'Hoàn thành',
  [SCHEDULE_STATUS.CANCELLED]: 'Đã hủy',
};

// Pagination defaults
export const PAGINATION_DEFAULTS = {
  PAGE: 1,
  LIMIT: 20,
  LIMITS: [10, 20, 50, 100],
} as const;

// Date formats
export const DATE_FORMATS = {
  DISPLAY: 'dd/MM/yyyy',
  DATETIME: 'dd/MM/yyyy HH:mm',
  API: 'yyyy-MM-dd',
} as const;